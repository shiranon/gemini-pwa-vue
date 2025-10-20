/**
 * 一貫したID生成ユーティリティ
 * 形式: `${prefix}_${timestamp}_${random}`
 */
const randomToken = (): string => {
  return Math.random().toString(36).slice(2, 9)
}

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${randomToken()}`
}

const generateChatId = (): string => {
  return generateId('chat')
}

const generateMessageId = (): string => {
  return generateId('msg')
}

const generateFileId = (): string => {
  return generateId('file')
}

const generateSoundId = (): string => {
  return generateId('sound')
}

export { generateChatId, generateMessageId, generateFileId, generateSoundId }
