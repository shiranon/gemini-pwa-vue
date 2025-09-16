/**
 * DexieJSを使用したIndexedDBデータベース設計
 * チャットデータの効率的な管理とクエリを提供
 */

import Dexie, { type Table } from 'dexie'
import { deserializeAssistantExtras, serializeAssistantExtras } from '~/lib/messageSerialization'
import type { AttachedFile, ChatSession, Message, UserMessage } from '~/types/chat'
import type {
  AppMetaRecord,
  AttachedFileRecord,
  ChatQueryOptions,
  ChatRecord,
  DatabaseOperationResult,
  DatabaseStats,
  ExportedData,
  ImportResult,
  MessageRecord,
  SettingsRecord,
} from '~/types/database'
import type { AppSettings } from '~/types/settings'

export const DB_NAME = 'GeminiPWADatabase'

export const TABLES = {
  chats: 'chats',
  messages: 'messages',
  attachedFiles: 'attachedFiles',
  settings: 'settings',
  appMeta: 'appMeta',
} as const

export const SCHEMAS = {
  v1: {
    [TABLES.chats]: 'id, title, createdAt, updatedAt, isArchived, isFavorite, [isArchived+updatedAt], messageCount',
    [TABLES.messages]: 'id, chatId, role, createdAt, updatedAt, [chatId+order], order',
    [TABLES.attachedFiles]: 'id, messageId, chatId, type, createdAt, size',
    [TABLES.settings]: 'id, updatedAt, version',
    [TABLES.appMeta]: 'key, updatedAt',
  },
} as const

export class GeminiDatabase extends Dexie {
  // テーブル定義
  chats!: Table<ChatRecord>
  messages!: Table<MessageRecord>
  attachedFiles!: Table<AttachedFileRecord>
  settings!: Table<SettingsRecord>
  appMeta!: Table<AppMetaRecord>

  constructor() {
    super(DB_NAME)

    this.version(1).stores(SCHEMAS.v1)
    this.version(2)
      .stores({})
      .upgrade(() => {
        console.log('データベースをバージョン2へアップグレード中...')
      })
  }
}

// シングルトンインスタンス
export const db = new GeminiDatabase()

export function chatSessionToRecord(session: ChatSession): ChatRecord {
  return {
    id: session.id,
    title: session.title,
    systemPrompt: session.systemPrompt,
    persistentMemory: JSON.stringify(session.persistentMemory),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    isArchived: session.isArchived || false,
    isFavorite: session.isFavorite || false,
    messageCount: session.messages.length,
  }
}

export function chatRecordToSession(record: ChatRecord): Omit<ChatSession, 'messages'> {
  return {
    id: record.id,
    title: record.title,
    systemPrompt: record.systemPrompt,
    persistentMemory: JSON.parse(record.persistentMemory || '{}'),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isArchived: record.isArchived,
    isFavorite: record.isFavorite,
  }
}

export function messageToRecord(message: Message, chatId: string, order: number): MessageRecord {
  const base: MessageRecord = {
    id: message.id,
    chatId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    order,
    isProofread: false,
  }

  if (message.role === 'assistant') {
    Object.assign(base, serializeAssistantExtras(message))
  }

  return base
}

export function messageRecordToMessage(record: MessageRecord): Message {
  const base = {
    id: record.id,
    role: record.role as 'user' | 'assistant' | 'system',
    content: record.content,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }

  if (record.role === 'assistant') {
    return {
      ...base,
      ...deserializeAssistantExtras(record),
    } as Message
  }

  return base as Message
}

export function fileToRecord(file: AttachedFile, messageId: string, chatId: string): AttachedFileRecord {
  return {
    ...file,
    messageId,
    chatId,
  }
}

export async function saveChat(session: ChatSession): Promise<DatabaseOperationResult<string>> {
  try {
    const startTime = Date.now()

    await db.transaction('rw', [db.chats, db.messages, db.attachedFiles], async () => {
      const chatRecord = chatSessionToRecord(session)
      await db.chats.put(chatRecord)

      await db.messages.where('chatId').equals(session.id).delete()
      await db.attachedFiles.where('chatId').equals(session.id).delete()

      for (let i = 0; i < session.messages.length; i++) {
        const message = session.messages[i]
        if (!message) continue

        const messageRecord = messageToRecord(message, session.id, i)
        await db.messages.put(messageRecord)

        if (message.role === 'user' && 'attachments' in message) {
          const userMessage = message as UserMessage
          const attachments = userMessage.attachments

          if (Array.isArray(attachments)) {
            for (const file of attachments) {
              const fileRecord = fileToRecord(file, message.id, session.id)
              await db.attachedFiles.put(fileRecord)
            }
          }
        }
      }
    })

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: session.id,
      performance: {
        queryType: 'saveChat',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    console.error('Failed to save chat:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function loadChat(chatId: string): Promise<DatabaseOperationResult<ChatSession | null>> {
  try {
    const startTime = Date.now()

    const chatRecord = await db.chats.get(chatId)
    if (!chatRecord) {
      return {
        success: true,
        data: null,
        performance: {
          queryType: 'loadChat',
          executionTime: Date.now() - startTime,
          resultCount: 0,
        },
      }
    }

    const messageRecords = await db.messages.where('[chatId+order]').between([chatId, Dexie.minKey], [chatId, Dexie.maxKey]).toArray()

    const messages: Message[] = []

    for (const messageRecord of messageRecords) {
      const message = messageRecordToMessage(messageRecord)

      // ユーザーメッセージの場合、添付ファイルを取得
      if (message.role === 'user') {
        const fileRecords = await db.attachedFiles.where('messageId').equals(message.id).toArray()
        if (fileRecords.length > 0) {
          ;(message as UserMessage).attachments = fileRecords
        }
      }

      messages.push(message)
    }

    const session: ChatSession = {
      ...chatRecordToSession(chatRecord),
      messages,
    }

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: session,
      performance: {
        queryType: 'loadChat',
        executionTime,
        resultCount: messages.length + 1,
      },
    }
  } catch (error) {
    console.error('Failed to load chat:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** チャット一覧を取得 */
export async function getChats(options: ChatQueryOptions = {}): Promise<DatabaseOperationResult<ChatRecord[]>> {
  try {
    const startTime = Date.now()

    let query = db.chats.orderBy(options.sortBy || 'updatedAt')

    // アーカイブ状態でフィルタ
    if (options.archived !== undefined) {
      query = query.filter((chat) => chat.isArchived === options.archived)
    }

    // お気に入り状態でフィルタ
    if (options.favorite !== undefined) {
      query = query.filter((chat) => chat.isFavorite === options.favorite)
    }

    // 検索キーワードでフィルタ
    if (options.query) {
      const searchTerm = options.query.toLowerCase()
      query = query.filter((chat) => chat.title.toLowerCase().includes(searchTerm) || chat.systemPrompt.toLowerCase().includes(searchTerm))
    }

    // ソート順（DexieのorderByは昇順。降順指定時にreverse()を適用）
    if (options.order === 'desc') {
      query = query.reverse()
    }

    // ページネーション
    if (options.offset) {
      query = query.offset(options.offset)
    }
    if (options.limit) {
      query = query.limit(options.limit)
    }

    const results = await query.toArray()

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: results,
      performance: {
        queryType: 'getChats',
        executionTime,
        resultCount: results.length,
      },
    }
  } catch (error) {
    console.error('Failed to get chats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function deleteChat(chatId: string): Promise<DatabaseOperationResult<boolean>> {
  try {
    const startTime = Date.now()

    await db.transaction('rw', [db.chats, db.messages, db.attachedFiles], async () => {
      await db.chats.delete(chatId)
      await db.messages.where('chatId').equals(chatId).delete()
      await db.attachedFiles.where('chatId').equals(chatId).delete()
    })

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: true,
      performance: {
        queryType: 'deleteChat',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    console.error('Failed to delete chat:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function saveSettings(settings: AppSettings): Promise<DatabaseOperationResult<boolean>> {
  try {
    // Blobは永続化しない
    const { backgroundImageBlob: _blob, ...rest } = settings
    const settingsRecord: SettingsRecord = {
      id: 'app-settings',
      data: JSON.stringify(rest),
      updatedAt: Date.now(),
      version: 1,
    }

    await db.settings.put(settingsRecord)

    return {
      success: true,
      data: true,
    }
  } catch (error) {
    console.error('Failed to save settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function loadSettings(): Promise<DatabaseOperationResult<AppSettings | null>> {
  try {
    const settingsRecord = await db.settings.get('app-settings')

    if (!settingsRecord) {
      return {
        success: true,
        data: null,
      }
    }

    const settings = JSON.parse(settingsRecord.data) as AppSettings

    return {
      success: true,
      data: settings,
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getDatabaseStats(): Promise<DatabaseOperationResult<DatabaseStats>> {
  try {
    const startTime = Date.now()

    const [totalChats, totalMessages, totalFiles, activeChats, archivedChats] = await Promise.all([
      db.chats.count(),
      db.messages.count(),
      db.attachedFiles.count(),
      db.chats.where('isArchived').equals(0).count(), // false = 0
      db.chats.where('isArchived').equals(1).count(), // true = 1
    ])

    // 最古と最新のチャット日時を取得
    const oldestChat = await db.chats.orderBy('createdAt').first()
    const newestChat = await db.chats.orderBy('createdAt').last()

    // 総データサイズを概算（正確には各レコードのサイズを計算する必要がある）
    const totalSize = await estimateDatabaseSize()

    const stats: DatabaseStats = {
      totalChats,
      totalMessages,
      totalFiles,
      totalSize,
      activeChats,
      archivedChats,
      oldestChatDate: oldestChat?.createdAt,
      newestChatDate: newestChat?.createdAt,
    }

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: stats,
      performance: {
        queryType: 'getDatabaseStats',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** データベースサイズを概算 */
async function estimateDatabaseSize(): Promise<number> {
  try {
    // 簡易的なサイズ計算（実際のバイト数とは異なる場合がある）
    const [chats, messages, files] = await Promise.all([db.chats.toArray(), db.messages.toArray(), db.attachedFiles.toArray()])

    let totalSize = 0

    // チャットレコードのサイズ
    totalSize += chats.reduce((sum, chat) => sum + JSON.stringify(chat).length, 0)

    // メッセージレコードのサイズ
    totalSize += messages.reduce((sum, message) => sum + JSON.stringify(message).length, 0)

    // ファイルレコードのサイズ（主にBase64データ）
    totalSize += files.reduce((sum, file) => sum + file.size, 0)

    return totalSize
  } catch (error) {
    console.error('Failed to estimate database size:', error)
    return 0
  }
}

/** 全チャットデータを削除 */
export async function clearAllChats(): Promise<DatabaseOperationResult<boolean>> {
  try {
    await db.transaction('rw', [db.chats, db.messages, db.attachedFiles], async () => {
      await Promise.all([db.chats.clear(), db.messages.clear(), db.attachedFiles.clear()])
    })

    return {
      success: true,
      data: true,
    }
  } catch (error) {
    console.error('Failed to clear all chats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 全データを削除 */
export async function clearAllData(): Promise<DatabaseOperationResult<boolean>> {
  try {
    await db.transaction('rw', [db.chats, db.messages, db.attachedFiles, db.settings, db.appMeta], async () => {
      await Promise.all([db.chats.clear(), db.messages.clear(), db.attachedFiles.clear(), db.settings.clear(), db.appMeta.clear()])
    })

    return {
      success: true,
      data: true,
    }
  } catch (error) {
    console.error('Failed to clear all data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** データをエクスポート */
export async function exportData(chatIds?: string[]): Promise<DatabaseOperationResult<ExportedData>> {
  try {
    const startTime = Date.now()

    // チャットデータ
    let chats: ChatRecord[]
    if (chatIds && chatIds.length > 0) {
      chats = await db.chats.where('id').anyOf(chatIds).toArray()
    } else {
      chats = await db.chats.toArray()
    }

    const chatIdSet = new Set(chats.map((chat) => chat.id))
    const messages = await db.messages.where('chatId').anyOf(Array.from(chatIdSet)).toArray()
    const files = await db.attachedFiles.where('chatId').anyOf(Array.from(chatIdSet)).toArray()
    const settings = await db.settings.get('app-settings')
    const appMeta = await db.appMeta.toArray()

    const exportedData: ExportedData = {
      meta: {
        exportedAt: Date.now(),
        appVersion: '1.0.0',
        dbVersion: 1,
        types: ['chats', 'messages', 'files', 'settings'],
      },
      chats,
      messages,
      files,
      settings: settings || undefined,
      appMeta,
    }

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: exportedData,
      performance: {
        queryType: 'exportData',
        executionTime,
        resultCount: chats.length + messages.length + files.length,
      },
    }
  } catch (error) {
    console.error('Failed to export data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** データをインポート */
export async function importData(data: ExportedData): Promise<DatabaseOperationResult<ImportResult>> {
  try {
    const result: ImportResult = {
      success: true,
      counts: {
        chats: 0,
        messages: 0,
        files: 0,
        settings: 0,
        appMeta: 0,
      },
      errors: [],
      warnings: [],
    }

    await db.transaction('rw', [db.chats, db.messages, db.attachedFiles, db.settings, db.appMeta], async () => {
      // チャットデータをインポート
      if (data.chats) {
        await db.chats.bulkPut(data.chats)
        result.counts.chats = data.chats.length
      }

      // メッセージデータをインポート
      if (data.messages) {
        await db.messages.bulkPut(data.messages)
        result.counts.messages = data.messages.length
      }

      // ファイルデータをインポート
      if (data.files) {
        await db.attachedFiles.bulkPut(data.files)
        result.counts.files = data.files.length
      }

      // 設定データをインポート
      if (data.settings) {
        await db.settings.put(data.settings)
        result.counts.settings = 1
      }

      // アプリメタデータをインポート
      if (data.appMeta) {
        await db.appMeta.bulkPut(data.appMeta)
        result.counts.appMeta = data.appMeta.length
      }
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Failed to import data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
