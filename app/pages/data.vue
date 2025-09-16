<template>
  <div class="mx-auto w-full max-w-5xl flex-1 items-center justify-between px-4">
    <div class="bg-card text-card-foreground mb-6 rounded-lg p-4 shadow-sm md:p-6">
      <div class="flex items-center justify-between">
        <h1 class="text-foreground text-2xl font-bold">データ管理</h1>
        <div class="text-muted-foreground text-sm">データのインポート・エクスポート・バックアップ</div>
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-8">
      <ExportSection
        :stats="stats"
        :database-size="databaseSize"
        :loading="loading"
        @export-full="exportFullBackup"
        @export-chats="exportChatsOnly"
      />

      <ImportSection
        :import-options="importOptions"
        @file-selected="processFile"
        @update-options="updateImportOptions"
      />

      <DangerSection
        :loading="loading"
        @clear-chats="confirmClearChats"
        @clear-all-data="confirmClearAllData"
      />

      <ImportResultDisplay
        v-if="importResult"
        :result="importResult"
        @close="clearImportResult"
      />
    </div>

    <AlertDialog
      v-model="isAlertDialogOpen"
      :title="alertTitle"
      :message="alertMessage"
      @ok="handleAlertOk"
    />

    <ConfirmDialog
      v-model="isConfirmDialogOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      @confirm="handleConfirmOk"
      @cancel="handleConfirmCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDataManagement } from '~/composables/useDataManagement'
import AlertDialog from '~/components/molecules/dialogs/AlertDialog.vue'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import ExportSection from '~/components/organisms/page-data/ExportSection.vue'
import ImportSection from '~/components/organisms/page-data/ImportSection.vue'
import DangerSection from '~/components/organisms/page-data/DangerSection.vue'
import ImportResultDisplay from '~/components/molecules/page-data/ImportResult.vue'

// ダイアログの状態管理
const isAlertDialogOpen = ref(false)
const isConfirmDialogOpen = ref(false)
const alertTitle = ref('')
const alertMessage = ref('')
const alertDescription = ref('')
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmDescription = ref('')
const confirmResolve = ref<((value: boolean) => void) | null>(null)

// ダイアログ表示関数
const showAlert = (message: string, title = '', description = '') => {
  alertTitle.value = title
  alertMessage.value = message
  alertDescription.value = description
  isAlertDialogOpen.value = true
}

const showConfirm = (message: string, title = '確認', description = ''): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmTitle.value = title
    confirmMessage.value = message
    confirmDescription.value = description
    confirmResolve.value = resolve
    isConfirmDialogOpen.value = true
  })
}

// ダイアログハンドラー
const handleAlertOk = () => {
  alertTitle.value = ''
  alertMessage.value = ''
  alertDescription.value = ''
}

const handleConfirmOk = () => {
  if (confirmResolve.value) {
    confirmResolve.value(true)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
  confirmDescription.value = ''
}

const handleConfirmCancel = () => {
  if (confirmResolve.value) {
    confirmResolve.value(false)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
  confirmDescription.value = ''
}

// データ管理コンポーザブルを使用（ダイアログ関数を渡す）
const {
  loading,
  stats,
  importResult,
  importOptions,

  databaseSize,

  exportFullBackup,
  exportChatsOnly,

  processFile,
  updateImportOptions,
  clearImportResult,

  confirmClearChats,
  confirmClearAllData,

  initialize,
} = useDataManagement({ showAlert, showConfirm })

onMounted(() => {
  initialize()
})
</script>
