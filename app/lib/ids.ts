/**
 * 一貫したID生成ユーティリティ
 * 形式: `${prefix}_${timestamp}_${random}`
 */
const randomToken = () => Math.random().toString(36).slice(2, 9)

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${randomToken()}`
}

export const generateChatId = () => generateId('chat')
export const generateMessageId = () => generateId('msg')
export const generateFileId = () => generateId('file')
