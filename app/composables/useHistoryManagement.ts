import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDatabase } from '~/composables/useDatabase'
import { downloadJson } from '~/lib/file'
import { buildChatExportData, buildChatsExportData, parseImportData } from '~/lib/history'
import { useChatStore } from '~/stores/chat'
import type { ChatSession, GetChatsOptions } from '~/types/chat'

/**
 * 履歴管理ページ用のコンポーザブル
 * 検索・フィルター・ソート・バッチ操作・個別チャット操作の状態管理とロジックを提供
 * ダイアログ表示は呼び出し側のコンポーネントで管理
 */
export function useHistoryManagement() {
  const router = useRouter()
  const database = useDatabase()
  const chatStore = useChatStore()

  const searchQuery = ref('')
  const sortOrder = ref<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
  const showArchived = ref<boolean | null>(false)
  const currentPage = ref(1)
  const itemsPerPage = ref(20)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const chats = ref<ChatSession[]>([])
  const stats = ref<{ totalChats: number; totalMessages: number } | null>(null)
  const batchMode = ref(false)
  const selectedChats = ref(new Set<string>())
  const selectAllChecked = ref(false)

  const filteredChats = computed(() => {
    let filtered = chats.value

    // アーカイブフィルター
    if (showArchived.value !== null) {
      filtered = filtered.filter((chat) => (showArchived.value ? chat.isArchived : !chat.isArchived))
    }
    // 検索フィルター
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter((chat) => chat.title.toLowerCase().includes(query) || chat.messages.some((msg) => msg.content.toLowerCase().includes(query)))
    }
    // ソート
    filtered.sort((a, b) => {
      switch (sortOrder.value) {
        case 'title':
          return a.title.localeCompare(b.title, 'ja')
        case 'createdAt':
          return b.createdAt - a.createdAt
        case 'updatedAt':
        default:
          return b.updatedAt - a.updatedAt
      }
    })
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filtered.slice(start, end)
  })

  const totalPages = computed(() => {
    const totalItems = chats.value.length
    return Math.ceil(totalItems / itemsPerPage.value)
  })

  const loadChats = async () => {
    loading.value = true
    error.value = null

    try {
      const options: GetChatsOptions = {
        limit: 1000,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }

      chats.value = await database.getChats(options)

      await database.refreshStats()
      stats.value = database.stats.value
    } catch (raisedError) {
      error.value = raisedError instanceof Error ? raisedError.message : '履歴の読み込みに失敗しました'
      logger.error('履歴読み込みエラー:', { component: 'useHistoryManagement' }, raisedError)
    } finally {
      loading.value = false
    }
  }

  const refreshData = async () => {
    await loadChats()
  }

  const createNewChat = () => {
    chatStore.createNewSession()
    router.push('/')
  }

  const selectChat = async (chat: ChatSession) => {
    try {
      const success = await chatStore.loadSession(chat.id)
      if (!success) {
        throw new Error('チャットの読み込みに失敗しました')
      }
      router.push('/')
    } catch (raisedError) {
      logger.error('チャットの選択に失敗:', { component: 'useHistoryManagement' }, raisedError)
      throw new Error('チャットの読み込みに失敗しました')
    }
  }

  const updateChatTitle = async (chatId: string, newTitle: string) => {
    const chat = chats.value.find((c) => c.id === chatId)
    if (!chat) {
      throw new Error('チャットが見つかりません')
    }

    if (newTitle && newTitle !== chat.title) {
      const updatedChat = {
        ...chat,
        title: newTitle,
        updatedAt: Date.now(),
      }
      await database.saveChat(updatedChat)
      await loadChats()
      return true
    }
    return false
  }

  const toggleArchive = async (chat: ChatSession) => {
    try {
      const updatedChat = {
        ...chat,
        isArchived: !chat.isArchived,
        updatedAt: Date.now(),
      }
      await database.saveChat(updatedChat)
      await loadChats()
    } catch {
      throw new Error('アーカイブ状態の変更に失敗しました')
    }
  }

  const deleteChatById = async (chatId: string) => {
    try {
      await database.deleteChat(chatId)
      await loadChats()
    } catch {
      throw new Error('チャットの削除に失敗しました')
    }
  }

  const exportChat = async (chat: ChatSession) => {
    try {
      const exportData = { ...buildChatExportData(chat), exportedAt: Date.now() }

      downloadJson(exportData, `gemini-chat-${chat.title}-${new Date().toISOString().slice(0, 10)}.json`)
    } catch {
      throw new Error('エクスポートに失敗しました')
    }
  }

  const toggleBatchMode = () => {
    batchMode.value = !batchMode.value
    if (!batchMode.value) {
      selectedChats.value.clear()
      selectAllChecked.value = false
    }
  }

  const toggleChatSelection = (chatId: string) => {
    if (selectedChats.value.has(chatId)) {
      selectedChats.value.delete(chatId)
    } else {
      selectedChats.value.add(chatId)
    }
    updateSelectAllState()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      filteredChats.value.forEach((chat) => {
        selectedChats.value.add(chat.id)
      })
    } else {
      selectedChats.value.clear()
    }
    selectAllChecked.value = checked
  }

  const updateSelectAllState = () => {
    const visibleChatIds = new Set(filteredChats.value.map((chat) => chat.id))
    const selectedVisibleChats = Array.from(selectedChats.value).filter((id) => visibleChatIds.has(id))
    selectAllChecked.value = selectedVisibleChats.length === filteredChats.value.length && filteredChats.value.length > 0
  }

  const batchExport = async () => {
    if (selectedChats.value.size === 0) return

    const selectedChatList = chats.value.filter((chat) => selectedChats.value.has(chat.id))

    const exportData = buildChatsExportData(selectedChatList)

    try {
      downloadJson(exportData, `gemini-chats-batch-${new Date().toISOString().slice(0, 10)}.json`)

      toggleBatchMode()
      return selectedChats.value.size
    } catch {
      throw new Error('バッチエクスポートに失敗しました')
    }
  }

  const batchArchiveChats = async () => {
    if (selectedChats.value.size === 0) return 0

    try {
      const updatePromises = Array.from(selectedChats.value).map(async (chatId) => {
        const chat = chats.value.find((c) => c.id === chatId)
        if (chat) {
          const updatedChat = {
            ...chat,
            isArchived: true,
            updatedAt: Date.now(),
          }
          await database.saveChat(updatedChat)
        }
      })

      await Promise.all(updatePromises)
      await loadChats()
      const count = selectedChats.value.size
      toggleBatchMode()
      return count
    } catch {
      throw new Error('バッチアーカイブに失敗しました')
    }
  }

  const batchDeleteChats = async () => {
    if (selectedChats.value.size === 0) return 0

    try {
      const deletePromises = Array.from(selectedChats.value).map((chatId) => database.deleteChat(chatId))

      await Promise.all(deletePromises)
      await loadChats()
      const count = selectedChats.value.size
      toggleBatchMode()
      return count
    } catch {
      throw new Error('バッチ削除に失敗しました')
    }
  }

  const importChats = async (file: File): Promise<number> => {
    try {
      const fileContent = await file.text()
      const data = JSON.parse(fileContent)

      const importedChats = parseImportData(data)

      const savePromises = importedChats.map((chat) => database.saveChat(chat))
      await Promise.all(savePromises)

      await loadChats()
      return importedChats.length
    } catch (error) {
      if (error instanceof Error) {
        throw new TypeError(`インポートに失敗しました: ${error.message}`)
      }
      throw new Error('インポートに失敗しました')
    }
  }

  watch([searchQuery, sortOrder, showArchived], () => {
    currentPage.value = 1
  })

  const initialize = async () => {
    await loadChats()
  }

  return {
    searchQuery,
    sortOrder,
    showArchived,
    currentPage,
    loading,
    error,
    stats,
    batchMode,
    selectedChats,
    selectAllChecked,

    filteredChats,
    totalPages,

    loadChats,
    refreshData,

    createNewChat,
    selectChat,

    updateChatTitle,
    toggleArchive,
    deleteChatById,
    exportChat,
    importChats,

    toggleBatchMode,
    toggleChatSelection,
    handleSelectAll,
    batchExport,
    batchArchiveChats,
    batchDeleteChats,

    initialize,
  }
}
