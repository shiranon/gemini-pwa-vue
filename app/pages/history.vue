<template>
  <div class="mx-auto w-full max-w-5xl flex-1 items-center justify-between px-4">
    <HistoryHeader
      :search-query="searchQuery"
      :sort-order="sortOrder"
      :show-archived="showArchived"
      :batch-mode="batchMode"
      :select-all-checked="selectAllChecked"
      :selected-count="selectedChats.size"
      :total-count="filteredChats.length"
      :stats="stats"
      @update:search-query="searchQuery = $event"
      @update:sort-order="sortOrder = $event"
      @update:show-archived="showArchived = $event"
      @toggle-batch-mode="toggleBatchMode"
      @create-new-chat="createNewChat"
      @import-chats="openImportDialog"
      @select-all="handleSelectAll"
      @batch-export="batchExport"
      @batch-archive="batchArchive"
      @batch-delete="batchDelete"
    />

    <HistoryContent
      :loading="loading"
      :error="error"
      :is-empty="filteredChats.length === 0"
      :search-query="searchQuery"
      :current-page="currentPage"
      :total-pages="totalPages"
      @refresh="refreshData"
      @create-new-chat="createNewChat"
      @update:current-page="currentPage = $event"
    >
      <HistoryList
        :chats="filteredChats"
        :loading="loading"
        :batch-mode="batchMode"
        :selected-chats="selectedChats"
        @select-chat="selectChat"
        @edit-title="editChatTitle"
        @toggle-archive="toggleArchive"
        @delete-chat="deleteChat"
        @export-chat="exportChat"
        @toggle-selection="toggleChatSelection"
      />
    </HistoryContent>

    <EditTitleDialog
      v-model="isEditDialogOpen"
      :initial-title="editingChatTitle"
      @save="handleTitleSave"
      @cancel="handleTitleCancel"
    />

    <ConfirmDialog
      v-model="isDeleteDialogOpen"
      title="チャット削除"
      :message="deleteDialogMessage"
      description="この操作は取り消せません"
      confirm-text="削除"
      :is-dangerous="true"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />

    <ConfirmDialog
      v-model="isBatchArchiveDialogOpen"
      title="バッチアーカイブ"
      :message="batchArchiveDialogMessage"
      description="この操作は取り消せません"
      confirm-text="アーカイブ"
      @confirm="handleBatchArchiveConfirm"
      @cancel="handleBatchArchiveCancel"
    />

    <ConfirmDialog
      v-model="isBatchDeleteDialogOpen"
      title="バッチ削除"
      :message="batchDeleteDialogMessage"
      description="この操作は取り消せません。削除されたデータは復元できません"
      confirm-text="削除"
      :is-dangerous="true"
      @confirm="handleBatchDeleteConfirm"
      @cancel="handleBatchDeleteCancel"
    />

    <AlertDialog
      v-model="isAlertDialogOpen"
      :title="alertTitle"
      :message="alertMessage"
      @ok="handleAlertOk"
    />

    <ImportDialog
      v-model:open="isImportDialogOpen"
      @import="handleImportFile"
      @cancel="handleImportCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useHistoryManagement } from '~/composables/useHistoryManagement'
import HistoryHeader from '~/components/organisms/page-history/HistoryHeader.vue'
import HistoryContent from '~/components/organisms/page-history/HistoryContent.vue'
import HistoryList from '~/components/organisms/page-history/HistoryList.vue'
import EditTitleDialog from '~/components/molecules/dialogs/EditTitleDialog.vue'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import AlertDialog from '~/components/molecules/dialogs/AlertDialog.vue'
import ImportDialog from '~/components/molecules/dialogs/ImportDialog.vue'
import type { ChatSession } from '~/types/chat'

const {
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
} = useHistoryManagement()

// ダイアログの表示状態
const isEditDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isBatchArchiveDialogOpen = ref(false)
const isBatchDeleteDialogOpen = ref(false)
const isAlertDialogOpen = ref(false)
const isImportDialogOpen = ref(false)

// ダイアログのメッセージと状態
const editingChatTitle = ref('')
const editingChatId = ref('')
const deleteDialogMessage = ref('')
const deletingChatId = ref('')
const batchArchiveDialogMessage = ref('')
const batchDeleteDialogMessage = ref('')
const alertTitle = ref('')
const alertMessage = ref('')

const editChatTitle = (chat: ChatSession) => {
  editingChatTitle.value = chat.title
  editingChatId.value = chat.id
  isEditDialogOpen.value = true
}

const deleteChat = (chat: ChatSession) => {
  deleteDialogMessage.value = `「${chat.title}」を削除してもよろしいですか？`
  deletingChatId.value = chat.id
  isDeleteDialogOpen.value = true
}

const batchArchive = () => {
  if (selectedChats.value.size === 0) return
  batchArchiveDialogMessage.value = `${selectedChats.value.size}件のチャットをアーカイブしますか？`
  isBatchArchiveDialogOpen.value = true
}

const batchDelete = () => {
  if (selectedChats.value.size === 0) return
  batchDeleteDialogMessage.value = `${selectedChats.value.size}件のチャットを削除しますか？`
  isBatchDeleteDialogOpen.value = true
}

const showAlert = (title: string, message: string) => {
  alertTitle.value = title
  alertMessage.value = message
  isAlertDialogOpen.value = true
}

const handleTitleSave = async (newTitle: string) => {
  if (editingChatId.value && newTitle) {
    try {
      const updated = await updateChatTitle(editingChatId.value, newTitle)
      if (updated) {
        showAlert('成功', 'タイトルを更新しました')
      }
    } catch (error) {
      showAlert('エラー', error instanceof Error ? error.message : 'タイトルの更新に失敗しました')
      logger.error('タイトル更新エラー:', { component: 'history' }, error)
    }
  }
  editingChatTitle.value = ''
  editingChatId.value = ''
}

const handleTitleCancel = () => {
  editingChatTitle.value = ''
  editingChatId.value = ''
}

const handleDeleteConfirm = async () => {
  try {
    await deleteChatById(deletingChatId.value)
    showAlert('成功', 'チャットを削除しました')
  } catch (error) {
    showAlert('エラー', error instanceof Error ? error.message : 'チャットの削除に失敗しました')
    logger.error('チャット削除エラー:', { component: 'history' }, error)
  }
  deletingChatId.value = ''
  deleteDialogMessage.value = ''
}

const handleDeleteCancel = () => {
  deletingChatId.value = ''
  deleteDialogMessage.value = ''
}

const handleBatchArchiveConfirm = async () => {
  try {
    const count = await batchArchiveChats()
    showAlert('成功', `${count}件のチャットをアーカイブしました`)
  } catch (error) {
    showAlert('エラー', error instanceof Error ? error.message : 'バッチアーカイブに失敗しました')
    logger.error('バッチアーカイブエラー:', { component: 'history' }, error)
  }
  batchArchiveDialogMessage.value = ''
}

const handleBatchArchiveCancel = () => {
  batchArchiveDialogMessage.value = ''
}

const handleBatchDeleteConfirm = async () => {
  try {
    const count = await batchDeleteChats()
    showAlert('成功', `${count}件のチャットを削除しました`)
  } catch (error) {
    showAlert('エラー', error instanceof Error ? error.message : 'バッチ削除に失敗しました')
    logger.error('バッチ削除エラー:', { component: 'history' }, error)
  }
  batchDeleteDialogMessage.value = ''
}

const handleBatchDeleteCancel = () => {
  batchDeleteDialogMessage.value = ''
}

const handleAlertOk = () => {
  alertTitle.value = ''
  alertMessage.value = ''
}

const openImportDialog = () => {
  isImportDialogOpen.value = true
}

const handleImportFile = async (file: File) => {
  try {
    const count = await importChats(file)
    showAlert('成功', `${count}件のチャットをインポートしました`)
  } catch (error) {
    showAlert('エラー', error instanceof Error ? error.message : 'インポートに失敗しました')
    logger.error('インポートエラー:', { component: 'history' }, error)
  }
}

const handleImportCancel = () => {
  isImportDialogOpen.value = false
}

watch([searchQuery, sortOrder, showArchived], () => {
  currentPage.value = 1 // フィルター変更時はページを最初に戻す
})

onMounted(() => {
  initialize()
})

declare global {
  interface Window {
    testShadcnDialogs?: {
      editChatTitle: (chat: ChatSession) => void
      deleteChat: (chat: ChatSession) => void
      batchArchive: () => void
      batchDelete: () => void
      showAlert: (title: string, message: string) => void
    }
  }
}

window.testShadcnDialogs = {
  editChatTitle,
  deleteChat,
  batchArchive,
  batchDelete,
  showAlert,
}
</script>
