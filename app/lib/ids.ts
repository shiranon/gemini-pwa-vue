/**
 * 一貫したID生成ユーティリティ
 * 形式: `${prefix}_${timestamp}_${random}`
 */
function randomToken(): string {
  return Math.random().toString(36).slice(2, 9)
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomToken()}`
}

export function generateChatId(): string {
  return generateId('chat')
}

export function generateMessageId(): string {
  return generateId('msg')
}

export function generateFileId(): string {
  return generateId('file')
}
