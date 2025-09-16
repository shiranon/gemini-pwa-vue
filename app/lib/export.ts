import type { ChatSession } from '~/types/chat'

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
