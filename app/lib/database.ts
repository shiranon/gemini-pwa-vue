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
  CharacterImageRecord,
  CharacterOutfitRecord,
  CharacterRecord,
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
import type { GlobalSettingsSnapshot, ProfileSettingKey } from '~/utils/settingsPartition'
import { cloneProfileSettings, extractGlobalSettings, extractProfileSettings, mergeProfilePartial, mergeSettingsFromSlices } from '~/utils/settingsPartition'

export const DB_NAME = 'GeminiPWADatabase'

export const TABLES = {
  chats: 'chats',
  messages: 'messages',
  attachedFiles: 'attachedFiles',
  settings: 'settings',
  settingsProfiles: 'settingsProfiles',
  appMeta: 'appMeta',
  characters: 'characters',
  characterOutfits: 'characterOutfits',
  characterImages: 'characterImages',
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
  characters!: Table<CharacterRecord>
  characterOutfits!: Table<CharacterOutfitRecord>
  characterImages!: Table<CharacterImageRecord>

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
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        logger.info('要約機能のためにバージョン4へアップグレード中...', { component: 'Database' })

        // 既存のメッセージにisSummaryフラグを追加
        const messages = await tx.table('messages').toArray()
        const updatedMessages = messages.map((msg: MessageRecord) => ({
          ...msg,
          isSummary: false,
        }))

        await tx.table('messages').bulkPut(updatedMessages)
        logger.info(`要約フラグを追加しました: ${updatedMessages.length}件のメッセージ`, { component: 'Database' })
      })
    this.version(5)
      .stores({
        characters: 'id, name, description, createdAt, updatedAt',
        characterOutfits: 'id, characterId, name, description, createdAt, updatedAt, [characterId+name]',
        characterImages: 'id, characterId, outfitId, expression, mimeType, base64Data, size, createdAt, updatedAt, [characterId+outfitId], [characterId+outfitId+expression]',
      })
      .upgrade(() => {
        logger.info('キャラクター画像管理機能のためにバージョン5へアップグレード中...', { component: 'Database' })
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

    this.characters.hook('creating', () => {
      this.notifyChange('create', 'characters', null)
    })
    this.characters.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'characters', primKey)
    })
    this.characters.hook('deleting', (primKey) => {
      this.notifyChange('delete', 'characters', primKey)
    })

    this.characterOutfits.hook('creating', () => {
      this.notifyChange('create', 'characterOutfits', null)
    })
    this.characterOutfits.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'characterOutfits', primKey)
    })
    this.characterOutfits.hook('deleting', (primKey) => {
      this.notifyChange('delete', 'characterOutfits', primKey)
    })

    this.characterImages.hook('creating', () => {
      this.notifyChange('create', 'characterImages', null)
    })
    this.characterImages.hook('updating', (_modifications, primKey) => {
      this.notifyChange('update', 'characterImages', primKey)
    })
    this.characterImages.hook('deleting', (primKey) => {
      this.notifyChange('delete', 'characterImages', primKey)
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
    isSummary: false,
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

// ============================================================================
// キャラクター画像管理
// ============================================================================

/** キャラクターを作成 */
export async function dbCreateCharacter(name: string, description?: string): Promise<DatabaseOperationResult<CharacterRecord>> {
  try {
    const startTime = Date.now()

    // 同名のキャラクターが存在するかチェック
    const existingCharacter = await db.characters.where('name').equals(name).first()
    if (existingCharacter) {
      return {
        success: false,
        error: '同じ名前のキャラクターが既に存在します',
      }
    }

    const character: CharacterRecord = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await db.characters.add(character)

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: character,
      performance: {
        queryType: 'createCharacter',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('キャラクターの作成に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 全キャラクターを取得 */
export async function dbGetAllCharacters(): Promise<DatabaseOperationResult<CharacterRecord[]>> {
  try {
    const startTime = Date.now()

    const characters = await db.characters.orderBy('createdAt').reverse().toArray()

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: characters,
      performance: {
        queryType: 'getAllCharacters',
        executionTime,
        resultCount: characters.length,
      },
    }
  } catch (error) {
    logger.error('キャラクター一覧の取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** キャラクターを更新 */
export async function dbUpdateCharacter(id: string, updates: Partial<Pick<CharacterRecord, 'name' | 'description'>>): Promise<DatabaseOperationResult<CharacterRecord>> {
  try {
    const startTime = Date.now()

    // 名前の重複チェック（名前が変更される場合）
    if (updates.name) {
      const existingCharacter = await db.characters.where('name').equals(updates.name).first()
      if (existingCharacter && existingCharacter.id !== id) {
        return {
          success: false,
          error: '同じ名前のキャラクターが既に存在します',
        }
      }
    }

    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    }

    await db.characters.update(id, updateData)
    const updatedCharacter = await db.characters.get(id)

    if (!updatedCharacter) {
      return {
        success: false,
        error: 'キャラクターが見つかりません',
      }
    }

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: updatedCharacter,
      performance: {
        queryType: 'updateCharacter',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('キャラクターの更新に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** キャラクターを削除 */
export async function dbDeleteCharacter(id: string): Promise<DatabaseOperationResult<boolean>> {
  try {
    const startTime = Date.now()

    await db.transaction('rw', [db.characters, db.characterOutfits, db.characterImages], async () => {
      // 関連する衣装と画像も削除
      await db.characterImages.where('characterId').equals(id).delete()
      await db.characterOutfits.where('characterId').equals(id).delete()
      await db.characters.delete(id)
    })

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: true,
      performance: {
        queryType: 'deleteCharacter',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('キャラクターの削除に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 衣装を作成 */
export async function dbCreateCharacterOutfit(characterId: string, name: string, description?: string): Promise<DatabaseOperationResult<CharacterOutfitRecord>> {
  try {
    const startTime = Date.now()

    // キャラクターの存在確認
    const character = await db.characters.get(characterId)
    if (!character) {
      return {
        success: false,
        error: '指定されたキャラクターが見つかりません',
      }
    }

    // 同じキャラクターの同名衣装が存在するかチェック
    const existingOutfit = await db.characterOutfits.where('[characterId+name]').equals([characterId, name]).first()
    if (existingOutfit) {
      return {
        success: false,
        error: '同じキャラクターの同名衣装が既に存在します',
      }
    }

    const outfit: CharacterOutfitRecord = {
      id: crypto.randomUUID(),
      characterId,
      name,
      description: description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await db.characterOutfits.add(outfit)

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: outfit,
      performance: {
        queryType: 'createCharacterOutfit',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('衣装の作成に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** キャラクターの衣装一覧を取得 */
export async function dbGetCharacterOutfits(characterId: string): Promise<DatabaseOperationResult<CharacterOutfitRecord[]>> {
  try {
    const startTime = Date.now()

    const outfits = await db.characterOutfits.where('characterId').equals(characterId).reverse().sortBy('createdAt')

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: outfits,
      performance: {
        queryType: 'getCharacterOutfits',
        executionTime,
        resultCount: outfits.length,
      },
    }
  } catch (error) {
    logger.error('衣装一覧の取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 衣装を更新 */
export async function dbUpdateCharacterOutfit(id: string, updates: Partial<Pick<CharacterOutfitRecord, 'name' | 'description'>>): Promise<DatabaseOperationResult<CharacterOutfitRecord>> {
  try {
    const startTime = Date.now()

    const outfit = await db.characterOutfits.get(id)
    if (!outfit) {
      return {
        success: false,
        error: '衣装が見つかりません',
      }
    }

    // 名前の重複チェック（名前が変更される場合）
    if (updates.name) {
      const existingOutfit = await db.characterOutfits.where('[characterId+name]').equals([outfit.characterId, updates.name]).first()
      if (existingOutfit && existingOutfit.id !== id) {
        return {
          success: false,
          error: '同じキャラクターの同名衣装が既に存在します',
        }
      }
    }

    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    }

    await db.characterOutfits.update(id, updateData)
    const updatedOutfit = await db.characterOutfits.get(id)

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: updatedOutfit!,
      performance: {
        queryType: 'updateCharacterOutfit',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('衣装の更新に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 衣装を削除 */
export async function dbDeleteCharacterOutfit(id: string): Promise<DatabaseOperationResult<boolean>> {
  try {
    const startTime = Date.now()

    await db.transaction('rw', [db.characterOutfits, db.characterImages], async () => {
      // 関連する画像も削除
      await db.characterImages.where('outfitId').equals(id).delete()
      await db.characterOutfits.delete(id)
    })

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: true,
      performance: {
        queryType: 'deleteCharacterOutfit',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('衣装の削除に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 画像をアップロード */
export async function dbUploadCharacterImage(
  characterId: string,
  outfitId: string,
  expression: string,
  base64Data: string,
  mimeType: string,
  size: number
): Promise<DatabaseOperationResult<CharacterImageRecord>> {
  try {
    const startTime = Date.now()

    // キャラクターと衣装の存在確認
    const [character, outfit] = await Promise.all([db.characters.get(characterId), db.characterOutfits.get(outfitId)])

    if (!character) {
      return {
        success: false,
        error: '指定されたキャラクターが見つかりません',
      }
    }

    if (!outfit) {
      return {
        success: false,
        error: '指定された衣装が見つかりません',
      }
    }

    if (outfit.characterId !== characterId) {
      return {
        success: false,
        error: '衣装が指定されたキャラクターに属していません',
      }
    }

    // 同じ組み合わせの画像が存在するかチェック
    const existingImage = await db.characterImages.where('[characterId+outfitId+expression]').equals([characterId, outfitId, expression]).first()
    if (existingImage) {
      return {
        success: false,
        error: '同じキャラクター、衣装、表情の組み合わせの画像が既に存在します',
      }
    }

    const image: CharacterImageRecord = {
      id: crypto.randomUUID(),
      characterId,
      outfitId,
      expression,
      mimeType,
      base64Data,
      size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await db.characterImages.add(image)

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: image,
      performance: {
        queryType: 'uploadCharacterImage',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('画像のアップロードに失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 衣装の画像一覧を取得 */
export async function dbGetOutfitImages(characterId: string, outfitId: string): Promise<DatabaseOperationResult<CharacterImageRecord[]>> {
  try {
    const startTime = Date.now()

    // 衣装が指定されたキャラクターに属しているかを検証
    const outfit = await db.characterOutfits.get(outfitId)
    if (!outfit) {
      return {
        success: false,
        error: '指定された衣装が見つかりません',
      }
    }

    if (outfit.characterId !== characterId) {
      return {
        success: false,
        error: '衣装が指定されたキャラクターに属していません',
      }
    }

    const images = await db.characterImages.where('outfitId').equals(outfitId).reverse().sortBy('createdAt')

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: images,
      performance: {
        queryType: 'getOutfitImages',
        executionTime,
        resultCount: images.length,
      },
    }
  } catch (error) {
    logger.error('画像一覧の取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 画像を削除 */
export async function dbDeleteCharacterImage(id: string): Promise<DatabaseOperationResult<boolean>> {
  try {
    const startTime = Date.now()

    await db.characterImages.delete(id)

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: true,
      performance: {
        queryType: 'deleteCharacterImage',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('画像の削除に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** キャラクター名、衣装名、表情から画像を直接取得 */
export async function dbGetCharacterImageByNames(characterName: string, outfitName: string, expression: string): Promise<DatabaseOperationResult<CharacterImageRecord | null>> {
  try {
    const startTime = Date.now()

    // 1. キャラクター名からIDを取得（インデックス使用）
    const character = await db.characters.where('name').equals(characterName).first()
    if (!character) {
      return {
        success: true,
        data: null,
        performance: {
          queryType: 'getCharacterImageByNames',
          executionTime: Date.now() - startTime,
          resultCount: 0,
        },
      }
    }

    // 2. 衣装名からIDを取得（複合インデックス使用）
    const outfit = await db.characterOutfits.where('[characterId+name]').equals([character.id, outfitName]).first()
    if (!outfit) {
      return {
        success: true,
        data: null,
        performance: {
          queryType: 'getCharacterImageByNames',
          executionTime: Date.now() - startTime,
          resultCount: 0,
        },
      }
    }

    // 3. 画像を直接取得（複合インデックス使用）
    const image = await db.characterImages.where('[characterId+outfitId+expression]').equals([character.id, outfit.id, expression]).first()

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: image || null,
      performance: {
        queryType: 'getCharacterImageByNames',
        executionTime,
        resultCount: image ? 1 : 0,
      },
    }
  } catch (error) {
    logger.error('キャラクター画像の取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** キャラクターの全画像を一括取得 */
export async function dbGetCharacterAllImages(characterId: string): Promise<DatabaseOperationResult<CharacterImageRecord[]>> {
  try {
    const startTime = Date.now()

    // 単一クエリでキャラクターの全画像を取得
    const images = await db.characterImages.where('characterId').equals(characterId).reverse().sortBy('createdAt')

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: images,
      performance: {
        queryType: 'getCharacterAllImages',
        executionTime,
        resultCount: images.length,
      },
    }
  } catch (error) {
    logger.error('キャラクターの全画像取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** キャラクターの最初の画像を取得 */
export async function dbGetCharacterFirstImage(characterId: string): Promise<DatabaseOperationResult<CharacterImageRecord | null>> {
  try {
    const startTime = Date.now()

    // 作成日時でソートして最初の1件のみを取得
    const firstImage = await db.characterImages
      .where('characterId')
      .equals(characterId)
      .sortBy('createdAt')
      .then((images) => images[0] || null)

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: firstImage,
      performance: {
        queryType: 'getCharacterFirstImage',
        executionTime,
        resultCount: firstImage ? 1 : 0,
      },
    }
  } catch (error) {
    logger.error('キャラクターの最初の画像取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** 全キャラクター画像を取得（エクスポート用） */
export async function dbGetAllCharacterImages(): Promise<DatabaseOperationResult<CharacterImageRecord[]>> {
  try {
    const startTime = Date.now()

    const images = await db.characterImages.orderBy('createdAt').reverse().toArray()

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: images,
      performance: {
        queryType: 'getAllCharacterImages',
        executionTime,
        resultCount: images.length,
      },
    }
  } catch (error) {
    logger.error('全キャラクター画像の取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** キャラクター画像の統計情報を取得 */
export async function dbGetCharacterImageStats(): Promise<
  DatabaseOperationResult<{
    totalImages: number
    totalSize: number
    characters: { id: string; name: string; imageCount: number }[]
    outfits: { id: string; characterId: string; name: string; imageCount: number }[]
  }>
> {
  try {
    const startTime = Date.now()

    // 全画像を取得
    const images = await db.characterImages.toArray()

    // 全キャラクターを取得
    const characters = await db.characters.toArray()

    // 全衣装を取得
    const outfits = await db.characterOutfits.toArray()

    // 統計情報を計算
    const totalImages = images.length
    const totalSize = images.reduce((sum, img) => sum + img.size, 0)

    // キャラクター別の画像数
    const characterStats = characters.map((char) => ({
      id: char.id,
      name: char.name,
      imageCount: images.filter((img) => img.characterId === char.id).length,
    }))

    // 衣装別の画像数
    const outfitStats = outfits.map((outfit) => ({
      id: outfit.id,
      characterId: outfit.characterId,
      name: outfit.name,
      imageCount: images.filter((img) => img.outfitId === outfit.id).length,
    }))

    const executionTime = Date.now() - startTime
    return {
      success: true,
      data: {
        totalImages,
        totalSize,
        characters: characterStats,
        outfits: outfitStats,
      },
      performance: {
        queryType: 'getCharacterImageStats',
        executionTime,
        resultCount: 1,
      },
    }
  } catch (error) {
    logger.error('キャラクター画像統計の取得に失敗しました:', { component: 'database' }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
