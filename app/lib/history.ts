import type { ChatSession, Message, PersistentMemory } from '~/types/chat'

interface SingleChatData {
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  isArchived?: boolean
  systemPrompt?: string
  persistentMemory?: PersistentMemory
  exportedAt?: number
}

interface BatchChatData {
  exportedAt: number
  totalChats: number
  chats: SingleChatData[]
}

export function buildChatExportData(chat: ChatSession) {
  return {
    title: chat.title,
    messages: chat.messages,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    isArchived: chat.isArchived ?? false,
  }
}

export function buildChatsExportData(chats: ChatSession[]) {
  return {
    exportedAt: Date.now(),
    totalChats: chats.length,
    chats: chats.map(buildChatExportData),
  }
}

/**
 * 単一チャットデータの型ガード
 */
function isSingleChatData(data: unknown): data is SingleChatData {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>
  return typeof obj.title === 'string' && Array.isArray(obj.messages) && typeof obj.createdAt === 'number' && typeof obj.updatedAt === 'number'
}

/**
 * バッチチャットデータの型ガード
 */
function isBatchChatData(data: unknown): data is BatchChatData {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>
  if (!obj.chats || !Array.isArray(obj.chats)) return false

  return obj.chats.every((chat) => isSingleChatData(chat))
}

/**
 * インポートデータのバリデーション
 */
export function validateImportData(data: unknown): { isValid: boolean; error?: string; type?: 'single' | 'batch' } {
  if (isSingleChatData(data)) {
    return { isValid: true, type: 'single' }
  }

  if (isBatchChatData(data)) {
    return { isValid: true, type: 'batch' }
  }

  return { isValid: false, error: '認識できないファイル形式です' }
}

/**
 * メッセージIDを新しく生成し直す
 */
function regenerateMessageIds(messages: Message[]): Message[] {
  return messages.map((message) => ({
    ...message,
    id: crypto.randomUUID(),
  }))
}

/**
 * 単一チャットデータをChatSessionに変換
 */
function convertSingleChatToSession(data: SingleChatData): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: data.title,
    systemPrompt: data.systemPrompt || '',
    messages: regenerateMessageIds(data.messages),
    persistentMemory: data.persistentMemory || { characters: [], flags: [], gameDate: '', scenes: [], relationships: [] },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isArchived: data.isArchived ?? false,
  }
}

/**
 * インポートデータをChatSessionに変換
 */
export function parseImportData(data: unknown): ChatSession[] {
  if (isSingleChatData(data)) {
    return [convertSingleChatToSession(data)]
  }

  if (isBatchChatData(data)) {
    return data.chats.map((chatData) => convertSingleChatToSession(chatData))
  }

  throw new Error('認識できないファイル形式です')
}

/**
 * インポート時の重複チェック用
 */
export interface ImportOptions {
  skipDuplicates?: boolean
  duplicateCheckFields?: ('title' | 'messages' | 'createdAt')[]
}

/**
 * 重複チェック機能付きインポートデータ変換
 */
export function parseImportDataWithDuplicateCheck(data: unknown, existingChats: ChatSession[] = [], options: ImportOptions = {}): ChatSession[] {
  const newChats = parseImportData(data)

  if (!options.skipDuplicates) {
    return newChats
  }

  const checkFields = options.duplicateCheckFields || ['title', 'createdAt']

  return newChats.filter((newChat) => {
    return !existingChats.some((existing) => {
      return checkFields.every((field) => {
        if (field === 'messages') {
          return existing.messages.length === newChat.messages.length && existing.messages.every((msg, i) => msg.content === newChat.messages[i]?.content && msg.role === newChat.messages[i]?.role)
        }
        return existing[field] === newChat[field]
      })
    })
  })
}
