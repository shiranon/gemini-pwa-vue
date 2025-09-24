/**
 * DexieJSを使用したIndexedDBデータベース設計
 * チャットデータの効率的な管理とクエリを提供
 */

import Dexie, { type IndexableType, type Table } from 'dexie'
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
  SettingsProfileRecord,
  SettingsRecord,
} from '~/types/database'
import type { AppSettings, SettingsProfileData } from '~/types/settings'
import { DEFAULT_SETTINGS } from '~/types/settings'
import { logger } from '~/utils/logger'
import { cloneProfileSettings, extractGlobalSettings, extractProfileSettings, mergeProfilePartial, mergeSettingsFromSlices } from '~/utils/settingsPartition'
import type { GlobalSettingsSnapshot, ProfileSettingKey } from '~/utils/settingsPartition'

export const DB_NAME = 'GeminiPWADatabase'

export const TABLES = {
  chats: 'chats',
  messages: 'messages',
  attachedFiles: 'attachedFiles',
  settings: 'settings',
  settingsProfiles: 'settingsProfiles',
  appMeta: 'appMeta',
} as const

const APP_META_KEYS = {
  profilesMeta: 'profiles-meta',
  systemDefaults: 'system-defaults',
} as const

const asIndexKey = (value: boolean): IndexableType => (value ? 1 : 0) as IndexableType

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
  settingsProfiles!: Table<SettingsProfileRecord, string>
  appMeta!: Table<AppMetaRecord>

  // Change listeners
  private changeListeners = new Set<(changeType: string, table: string, key: string | number | null) => void>()

  constructor() {
    super(DB_NAME)

    this.version(1).stores(SCHEMAS.v1)
    this.version(2)
      .stores({})
      .upgrade(() => {
        logger.info('データベースをバージョン2へアップグレード中...', { component: 'Database' })
      })
    this.version(3)
      .stores({
        settingsProfiles: 'id, name, createdAt, updatedAt, isDefault',
      })
      .upgrade(() => {
        logger.info('プロファイル機能のためにバージョン3へアップグレード中...', { component: 'Database' })
      })

    this.setupHooks()
  }

  private setupHooks() {
    this.chats.hook('creating', () => {
      this.notifyChange('create', 'chats', null)
    })
    this.chats.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'chats', primKey)
    })
    this.chats.hook('deleting', (primKey) => {
      this.notifyChange('delete', 'chats', primKey)
    })

    this.messages.hook('creating', () => {
      this.notifyChange('create', 'messages', null)
    })
    this.messages.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'messages', primKey)
    })
    this.messages.hook('deleting', (primKey) => {
      this.notifyChange('delete', 'messages', primKey)
    })

    this.attachedFiles.hook('creating', () => {
      this.notifyChange('create', 'attachedFiles', null)
    })
    this.attachedFiles.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'attachedFiles', primKey)
    })
    this.attachedFiles.hook('deleting', (primKey) => {
      this.notifyChange('delete', 'attachedFiles', primKey)
    })

    this.settings.hook('creating', () => {
      this.notifyChange('create', 'settings', null)
    })
    this.settings.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'settings', primKey)
    })

    this.appMeta.hook('creating', () => {
      this.notifyChange('create', 'appMeta', null)
    })
    this.appMeta.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'appMeta', primKey)
    })
    this.appMeta.hook('deleting', (primKey) => {
      this.notifyChange('delete', 'appMeta', primKey)
    })
  }

  private notifyChange(changeType: string, table: string, key: string | number | null) {
    this.changeListeners.forEach((listener) => {
      try {
        listener(changeType, table, key)
      } catch (error) {
        logger.error('変更通知時にエラーが発生しました:', { component: 'database' }, error)
      }
    })
  }

  public onDatabaseChange(listener: (changeType: string, table: string, key: string | number | null) => void): () => void {
    this.changeListeners.add(listener)
    return () => {
      this.changeListeners.delete(listener)
    }
  }
}

// シングルトンインスタンス
export const db = new GeminiDatabase()

type SerializableGlobalSettings = Omit<GlobalSettingsSnapshot, 'backgroundImageBlob'>

export interface SystemDefaultsSnapshot {
  global: GlobalSettingsSnapshot
  profile: SettingsProfileData
}

const stripNonSerializableGlobalSettings = (settings: GlobalSettingsSnapshot): SerializableGlobalSettings => {
  const { backgroundImageBlob: _blob, ...rest } = settings
  return rest
}

const deserializeGlobalSettings = (data: string): GlobalSettingsSnapshot => {
  const parsed = JSON.parse(data) as SerializableGlobalSettings
  return {
    backgroundImageBlob: null,
    ...parsed,
  }
}

const defaultProfileSettings = extractProfileSettings(DEFAULT_SETTINGS)

const deserializeProfileSettings = (data: string): SettingsProfileData => {
  const parsed = JSON.parse(data) as Partial<Record<ProfileSettingKey, unknown>>
  return mergeProfilePartial(defaultProfileSettings, parsed)
}

const serializeProfileSettings = (settings: SettingsProfileData): string => {
  const cloned = cloneProfileSettings(settings)
  return JSON.stringify(cloned)
}

const parseProfilesMetaValue = (value?: string | null): string | null => {
  if (!value) return null
  try {
    const meta = JSON.parse(value) as { activeProfileId?: string | null }
    return meta.activeProfileId ?? null
  } catch (error) {
    logger.warn('プロファイルメタの解析に失敗しました', { component: 'database' }, error)
    return null
  }
}

const ensureSystemDefaults = async (): Promise<SystemDefaultsSnapshot> => {
  const record = await db.appMeta.get(APP_META_KEYS.systemDefaults)
  if (record?.value) {
    try {
      const parsed = JSON.parse(record.value) as {
        global: SerializableGlobalSettings
        profile: SettingsProfileData
      }
      return {
        global: {
          backgroundImageBlob: null,
          ...parsed.global,
        },
        profile: mergeProfilePartial(defaultProfileSettings, parsed.profile),
      }
    } catch (error) {
      logger.warn('システムデフォルトの解析に失敗しました。デフォルト値で再作成します。', { component: 'database' }, error)
    }
  }

  const defaultGlobal = extractGlobalSettings(DEFAULT_SETTINGS)
  const defaultProfile = cloneProfileSettings(defaultProfileSettings)

  const payload: SystemDefaultsSnapshot = {
    global: {
      ...defaultGlobal,
      backgroundImageBlob: null,
    },
    profile: cloneProfileSettings(defaultProfile),
  }

  await db.appMeta.put({
    key: APP_META_KEYS.systemDefaults,
    value: JSON.stringify({
      global: stripNonSerializableGlobalSettings(defaultGlobal),
      profile: defaultProfile,
    }),
    updatedAt: Date.now(),
  })

  return payload
}

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

      // 既存のメッセージと添付ファイルを削除
      await db.messages.where('chatId').equals(session.id).delete()
      await db.attachedFiles.where('chatId').equals(session.id).delete()

      // メッセージレコードと添付ファイルレコードを準備
      const messageRecords: MessageRecord[] = []
      const fileRecords: AttachedFileRecord[] = []

      for (let i = 0; i < session.messages.length; i++) {
        const message = session.messages[i]
        if (!message) continue

        const messageRecord = messageToRecord(message, session.id, i)
        messageRecords.push(messageRecord)

        if (message.role === 'user' && 'attachments' in message) {
          const userMessage = message as UserMessage
          const attachments = userMessage.attachments

          if (Array.isArray(attachments)) {
            for (const file of attachments) {
              const fileRecord = fileToRecord(file, message.id, session.id)
              fileRecords.push(fileRecord)
            }
          }
        }
      }

      // バルク操作でメッセージと添付ファイルを保存
      if (messageRecords.length > 0) {
        await db.messages.bulkPut(messageRecords)
      }
      if (fileRecords.length > 0) {
        await db.attachedFiles.bulkPut(fileRecords)
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
    logger.error('チャットの保存に失敗しました:', { component: 'database' }, error)
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

    // メッセージと添付ファイルを並列で取得
    const [messageRecords, allFileRecords] = await Promise.all([
      db.messages.where('[chatId+order]').between([chatId, Dexie.minKey], [chatId, Dexie.maxKey]).toArray(),
      db.attachedFiles.where('chatId').equals(chatId).toArray(),
    ])

    // 添付ファイルをメッセージIDでグループ化（メモリ上で高速検索）
    const filesByMessageId = new Map<string, AttachedFileRecord[]>()
    for (const file of allFileRecords) {
      if (!filesByMessageId.has(file.messageId)) {
        filesByMessageId.set(file.messageId, [])
      }
      filesByMessageId.get(file.messageId)!.push(file)
    }

    // メッセージを構築
    const messages: Message[] = messageRecords.map((messageRecord) => {
      const message = messageRecordToMessage(messageRecord)

      // ユーザーメッセージの場合、添付ファイルをマップから取得
      if (message.role === 'user') {
        const attachments = filesByMessageId.get(message.id)
        if (attachments && attachments.length > 0) {
          ;(message as UserMessage).attachments = attachments
        }
      }

      return message
    })

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
    logger.error('チャットの読み込みに失敗しました:', { component: 'database' }, error)
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
    const sortBy = options.sortBy ?? 'updatedAt'
    const order = options.order ?? 'desc'

    // シンプルなクエリに戻す
    let query = db.chats.orderBy(sortBy)

    // アーカイブ状態でフィルタ（ブール値で直接フィルタ）
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
      query = query.filter((chat) => {
        const title = chat.title.toLowerCase()
        const systemPrompt = chat.systemPrompt?.toLowerCase() ?? ''
        return title.includes(searchTerm) || systemPrompt.includes(searchTerm)
      })
    }

    // ソート順（降順の場合はreverse）
    if (order === 'desc') {
      query = query.reverse()
    }

    // ページネーション
    if (options.offset && options.offset > 0) {
      query = query.offset(options.offset)
    }
    if (options.limit && options.limit > 0) {
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
    logger.error('チャットの一覧取得に失敗しました:', { component: 'database' }, error)
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
    logger.error('チャットの削除に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function saveSettings(settings: AppSettings): Promise<DatabaseOperationResult<boolean>> {
  try {
    const globalSettings = extractGlobalSettings(settings)
    const serializableGlobal = stripNonSerializableGlobalSettings(globalSettings)
    const settingsRecord: SettingsRecord = {
      id: 'app-settings',
      data: JSON.stringify(serializableGlobal),
      updatedAt: Date.now(),
      version: 1,
    }

    await db.settings.put(settingsRecord)

    return {
      success: true,
      data: true,
    }
  } catch (error) {
    logger.error('設定の保存に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function loadSettings(): Promise<DatabaseOperationResult<AppSettings | null>> {
  try {
    const [settingsRecord, systemDefaults] = await Promise.all([db.settings.get('app-settings'), ensureSystemDefaults()])

    if (!settingsRecord) {
      return {
        success: true,
        data: null,
      }
    }

    const globalSettings = deserializeGlobalSettings(settingsRecord.data)

    let profileSettings = cloneProfileSettings(systemDefaults.profile)

    const metaRecord = await db.appMeta.get(APP_META_KEYS.profilesMeta)
    const activeProfileId = parseProfilesMetaValue(metaRecord?.value)
    if (activeProfileId) {
      const activeProfileRecord = await db.settingsProfiles.get(activeProfileId)
      if (activeProfileRecord) {
        profileSettings = deserializeProfileSettings(activeProfileRecord.data)
      }
    }

    const merged = mergeSettingsFromSlices(DEFAULT_SETTINGS, globalSettings, profileSettings)

    return {
      success: true,
      data: merged,
    }
  } catch (error) {
    logger.error('設定の読み込みに失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function loadSystemDefaults(): Promise<DatabaseOperationResult<SystemDefaultsSnapshot>> {
  try {
    const defaults = await ensureSystemDefaults()
    return {
      success: true,
      data: defaults,
    }
  } catch (error) {
    logger.error('システムデフォルトの読み込みに失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 設定プロファイルを保存 */
export async function saveSettingsProfiles(profiles: Array<import('~/types/settings').SettingsProfile>, activeProfileId: string | null): Promise<DatabaseOperationResult<boolean>> {
  try {
    await db.transaction('rw', [db.settingsProfiles, db.appMeta], async () => {
      // 既存のプロファイルを削除
      await db.settingsProfiles.clear()

      // プロファイルレコードを作成
      const profileRecords: SettingsProfileRecord[] = profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        data: serializeProfileSettings(profile.settings),
        isDefault: profile.isDefault || false,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      }))

      // プロファイルを保存
      if (profileRecords.length > 0) {
        await db.settingsProfiles.bulkPut(profileRecords)
      }

      // アクティブプロファイルIDをメタデータに保存
      await db.appMeta.put({
        key: APP_META_KEYS.profilesMeta,
        value: JSON.stringify({ activeProfileId }),
        updatedAt: Date.now(),
      })
    })

    return {
      success: true,
      data: true,
    }
  } catch (error) {
    logger.error('プロファイルの保存に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 設定プロファイルを読み込み */
export async function loadSettingsProfiles(): Promise<
  DatabaseOperationResult<{
    profiles: Array<import('~/types/settings').SettingsProfile>
    activeProfileId: string | null
  }>
> {
  try {
    const profileRecords = await db.settingsProfiles.toArray()
    const metaRecord = await db.appMeta.get(APP_META_KEYS.profilesMeta)

    const profiles = profileRecords.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      settings: deserializeProfileSettings(record.data),
      isDefault: record.isDefault,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }))

    let activeProfileId: string | null = null
    activeProfileId = parseProfilesMetaValue(metaRecord?.value)

    return {
      success: true,
      data: {
        profiles,
        activeProfileId,
      },
    }
  } catch (error) {
    logger.error('プロファイルの読み込みに失敗しました:', { component: 'database' }, error)
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
      db.chats.where('isArchived').equals(asIndexKey(false)).count(),
      db.chats.where('isArchived').equals(asIndexKey(true)).count(),
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
    logger.error('データベースの統計情報の取得に失敗しました:', { component: 'database' }, error)
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
    logger.error('データベースのサイズの推定に失敗しました:', { component: 'database' }, error)
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
    logger.error('すべてのチャットの削除に失敗しました:', { component: 'database' }, error)
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
    logger.error('すべてのデータの削除に失敗しました:', { component: 'database' }, error)
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
    logger.error('データのエクスポートに失敗しました:', { component: 'database' }, error)
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
    logger.error('データのインポートに失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
