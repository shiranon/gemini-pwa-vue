import { computed, ref } from 'vue'
import { runAction, type ActionContext } from '~/lib/async'
import {
  clearAllChats as dbClearAllChats,
  clearAllData as dbClearAllData,
  deleteChat as dbDeleteChat,
  exportData as dbExportData,
  getChats as dbGetChats,
  getDatabaseStats as dbGetDatabaseStats,
  importData as dbImportData,
  loadChat as dbLoadChat,
  loadSettings as dbLoadSettings,
  saveChat as dbSaveChat,
  saveSettings as dbSaveSettings,
} from '~/lib/database'
import { formatFileSize } from '~/lib/format'
import { generateChatId as genChatId, generateFileId as genFileId, generateMessageId as genMsgId } from '~/lib/ids'
import type { ChatSession, GetChatsOptions } from '~/types/chat'
import type { ChatQueryOptions, DatabaseStats, ExportedData, ImportResult } from '~/types/database'
import type { AppSettings } from '~/types/settings'

const isInitialized = ref(false)
const isLoading = ref(false)
const lastError = ref<string | null>(null)
const stats = ref<DatabaseStats | null>(null)

export function useDatabase() {
  const actionCtx: ActionContext = {
    setLoading: (v) => (isLoading.value = v),
    setError: (m) => (lastError.value = m),
    logger: (m, ...args) => console.log(m, ...args),
  }
  const initialize = async (): Promise<boolean> => {
    if (isInitialized.value) return true

    try {
      isLoading.value = true
      lastError.value = null

      const statsResult = await dbGetDatabaseStats()
      if (!statsResult.success) {
        throw new Error(statsResult.error || 'Failed to initialize database')
      }

      stats.value = statsResult.data || null
      isInitialized.value = true

      console.log('データベースの初期化に成功', stats.value)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      lastError.value = errorMessage
      console.error('データベースの初期化に失敗:', errorMessage)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const saveChat = async (session: ChatSession): Promise<boolean> => {
    const res = await runAction('saveChat', actionCtx, async () => {
      const result = await dbSaveChat(session)
      if (!result.success) throw new Error(result.error || 'Failed to save chat')
      await refreshStats()
      return result
    })
    if (!res.ok) return false
    console.log(`チャットを保存しました: ${session.id}`, res.data.performance)
    return true
  }

  const loadChat = async (chatId: string): Promise<ChatSession | null> => {
    const res = await runAction('loadChat', actionCtx, async () => {
      const result = await dbLoadChat(chatId)
      if (!result.success) throw new Error(result.error || 'Failed to load chat')
      return result
    })
    if (!res.ok) return null
    console.log(`チャットを読み込みました: ${chatId}`, res.data.performance)
    return res.data.data || null
  }

  const getChats = async (options: GetChatsOptions = {}): Promise<ChatSession[]> => {
    const queryOptions: ChatQueryOptions = {
      query: options.query,
      archived: options.archived,
      favorite: options.favorite,
      sortBy: options.sortBy,
      order: options.sortOrder,
      limit: options.limit,
      offset: options.offset,
    }

    const res = await runAction('getChats', actionCtx, async () => {
      const result = await dbGetChats(queryOptions)
      if (!result.success) throw new Error(result.error || 'Failed to get chats')
      return result
    })

    if (!res.ok) return []

    const chatRecords = res.data.data || []
    const loaded = await Promise.all(chatRecords.map((record) => loadChat(record.id)))
    const chatSessions = loaded.filter((c): c is ChatSession => Boolean(c))
    console.log(`チャット一覧を取得: ${chatSessions.length} 件`, res.data.performance)
    return chatSessions
  }

  const deleteChat = async (chatId: string): Promise<boolean> => {
    const res = await runAction('deleteChat', actionCtx, async () => {
      const result = await dbDeleteChat(chatId)
      if (!result.success) throw new Error(result.error || 'Failed to delete chat')
      await refreshStats()
      return result
    })
    if (!res.ok) return false
    console.log(`チャットを削除しました: ${chatId}`, res.data.performance)
    return true
  }

  const saveSettings = async (settings: AppSettings): Promise<boolean> => {
    const res = await runAction('saveSettings', actionCtx, async () => {
      const result = await dbSaveSettings(settings)
      if (!result.success) throw new Error(result.error || 'Failed to save settings')
      return result
    })
    if (!res.ok) return false
    console.log('設定を保存しました')
    return true
  }

  const loadSettings = async (): Promise<AppSettings | null> => {
    const res = await runAction('loadSettings', actionCtx, async () => {
      const result = await dbLoadSettings()
      if (!result.success) throw new Error(result.error || 'Failed to load settings')
      return result
    })
    if (!res.ok) return null
    console.log('設定を読み込みました')
    return res.data.data || null
  }

  const clearAllChats = async (): Promise<boolean> => {
    const res = await runAction('clearAllChats', actionCtx, async () => {
      const result = await dbClearAllChats()
      if (!result.success) throw new Error(result.error || 'Failed to clear all chats')
      await refreshStats()
      return result
    })
    if (!res.ok) return false
    console.log('すべてのチャットを削除しました')
    return true
  }

  const refreshStats = async (): Promise<void> => {
    try {
      const result = await dbGetDatabaseStats()
      if (result.success) {
        stats.value = result.data || null
      }
    } catch (error) {
      console.error('統計情報の更新に失敗:', error)
    }
  }

  const clearAllData = async (): Promise<boolean> => {
    const res = await runAction('clearAllData', actionCtx, async () => {
      const result = await dbClearAllData()
      if (!result.success) throw new Error(result.error || 'Failed to clear all data')
      stats.value = {
        totalChats: 0,
        totalMessages: 0,
        totalFiles: 0,
        totalSize: 0,
        activeChats: 0,
        archivedChats: 0,
      }
      return result
    })
    if (!res.ok) return false
    console.log('すべてのデータを削除しました')
    return true
  }

  const exportData = async (chatIds?: string[]): Promise<ExportedData | null> => {
    const res = await runAction('exportData', actionCtx, async () => {
      const result = await dbExportData(chatIds)
      if (!result.success) throw new Error(result.error || 'Failed to export data')
      return result
    })
    if (!res.ok) return null
    console.log('データを書き出しました', res.data.performance)
    return res.data.data || null
  }

  const importData = async (data: ExportedData): Promise<ImportResult | null> => {
    const res = await runAction('importData', actionCtx, async () => {
      const result = await dbImportData(data)
      if (!result.success) throw new Error(result.error || 'Failed to import data')
      await refreshStats()
      return result
    })
    if (!res.ok) return null
    console.log('データを読み込みました', res.data.data)
    return res.data.data || null
  }

  const generateChatId = (): string => genChatId()
  const generateMessageId = (): string => genMsgId()
  const generateFileId = (): string => genFileId()

  const formatDatabaseSize = computed(() => {
    if (!stats.value) return '0 B'
    return formatFileSize(stats.value.totalSize)
  })

  const clearError = () => {
    lastError.value = null
  }

  const hasError = computed(() => lastError.value !== null)

  const watchDatabaseChanges = (callback: () => void) => {
    // TODO: 実際の実装では、DexieJSのhooksやobserverを使用
    const interval = setInterval(async () => {
      await refreshStats()
      callback()
    }, 30000) // 30秒間隔でチェック

    return () => clearInterval(interval)
  }

  return {
    isInitialized,
    isLoading,
    lastError,
    stats,
    hasError,
    formatDatabaseSize,

    initialize,

    saveChat,
    loadChat: loadChat,
    getChat: loadChat, // getChat is an alias for loadChat
    getChats,
    deleteChat,

    saveSettings,
    loadSettings,

    refreshStats,
    clearAllChats,
    clearAllData,
    exportData,
    importData,

    generateChatId,
    generateMessageId,
    generateFileId,
    formatFileSize,

    clearError,

    watchDatabaseChanges,
  }
}

/** チャット検索のヘルパー */
export function useChatQuery() {
  const database = useDatabase()

  const searchChats = async (query: string, options: Omit<ChatQueryOptions, 'query'> = {}) => {
    return await database.getChats({ ...options, query })
  }

  const getRecentChats = async (limit = 10) => {
    return await database.getChats({
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit,
      archived: false,
    })
  }

  const getArchivedChats = async () => {
    return await database.getChats({
      archived: true,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    })
  }

  const getFavoriteChats = async () => {
    return await database.getChats({
      favorite: true,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    })
  }

  return {
    searchChats,
    getRecentChats,
    getArchivedChats,
    getFavoriteChats,
  }
}

/** バックアップ操作のヘルパー */
export function useBackup() {
  const database = useDatabase()

  const createBackup = async (chatIds?: string[]) => {
    const data = await database.exportData(chatIds)
    if (!data) return null

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })

    return {
      blob,
      filename: `gemini-pwa-backup-${new Date().toISOString().split('T')[0]}.json`,
      data,
    }
  }

  const restoreFromBackup = async (file: File): Promise<ImportResult | null> => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportedData

      return await database.importData(data)
    } catch (error) {
      console.error('バックアップからの復元に失敗:', error)
      return null
    }
  }

  return {
    createBackup,
    restoreFromBackup,
  }
}
