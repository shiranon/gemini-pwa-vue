import { computed, ref } from 'vue'
import { useDatabase } from '~/composables/useDatabase'
import { useStorageQuota } from '~/composables/useStorageQuota'
import { downloadBackup, importFullData, loadBackupFromFile, type ImportResult } from '~/lib/backup'
import { downloadJson } from '~/lib/file'
import { buildChatsExportData } from '~/lib/history'
import { logger } from '~/utils/logger'

// ダイアログ関数の型定義
interface DialogFunctions {
  showAlert: (message: string, title?: string) => void
  showConfirm: (message: string, title?: string) => Promise<boolean>
}

/**
 * データ管理ページ用のコンポーザブル
 * エクスポート・インポート・削除機能の状態管理とロジックを提供
 */
export function useDataManagement(dialogs: DialogFunctions) {
  const database = useDatabase()
  const storageQuota = useStorageQuota()

  const loading = ref(false)

  const stats = ref(database.stats.value)

  const importResult = ref<ImportResult | null>(null)

  const importOptions = ref({
    importChats: true,
    importSettings: true,
    replaceExisting: false,
  })

  const databaseSize = computed(() => database.formatDatabaseSize.value)

  const exportFullBackup = async () => {
    try {
      loading.value = true
      await downloadBackup()
      dialogs.showAlert('完全バックアップをダウンロードしました')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      dialogs.showAlert(`バックアップの作成に失敗しました: ${message}`)
      logger.error('バックアップの書き出しエラー:', { component: 'useDataManagement' }, err)
    } finally {
      loading.value = false
    }
  }

  const exportChatsOnly = async () => {
    try {
      loading.value = true
      const chats = await database.getChats({ limit: 10000 })

      const exportData = buildChatsExportData(chats)

      downloadJson(exportData, `gemini-chats-${new Date().toISOString().slice(0, 10)}.json`)

      dialogs.showAlert('チャットデータをダウンロードしました')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dialogs.showAlert(`チャットデータのエクスポートに失敗しました: ${message}`)
      logger.error('チャット書き出しエラー:', { component: 'useDataManagement' }, error)
    } finally {
      loading.value = false
    }
  }

  const processFile = async (file: File) => {
    try {
      loading.value = true
      importResult.value = null

      if (!file.name.endsWith('.json')) {
        dialogs.showAlert('JSONファイルのみ対応しています')
        return
      }

      const backupData = await loadBackupFromFile(file)
      const result = await importFullData(backupData, importOptions.value)

      importResult.value = result

      if (result.success) {
        await refreshStats()
        dialogs.showAlert('データのインポートが完了しました')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dialogs.showAlert(`ファイルの処理に失敗しました: ${message}`)
      logger.error('ファイル処理エラー:', { component: 'useDataManagement' }, error)
    } finally {
      loading.value = false
    }
  }

  const updateImportOptions = (key: keyof typeof importOptions.value, value: boolean) => {
    importOptions.value[key] = value
  }

  const clearImportResult = () => {
    importResult.value = null
  }

  const confirmClearChats = async () => {
    const confirmed = await dialogs.showConfirm('すべてのチャットデータを削除しますか？', 'この操作は取り消すことができません。チャット履歴とメッセージがすべて失われます。')

    if (confirmed) {
      try {
        loading.value = true
        const success = await database.clearAllChats()

        if (success) {
          await refreshStats()
          dialogs.showAlert('すべてのチャットデータを削除しました')
        } else {
          dialogs.showAlert('チャットデータの削除に失敗しました')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        dialogs.showAlert(`削除中にエラーが発生しました: ${message}`)
        logger.error('チャット削除エラー:', { component: 'useDataManagement' }, error)
      } finally {
        loading.value = false
      }
    }
  }

  const confirmClearAllData = async () => {
    const confirmed = await dialogs.showConfirm(
      'すべてのデータを削除しますか？',
      '警告: この操作により、チャット履歴、設定、その他すべてのデータが完全に失われます。この操作は取り消すことができません。'
    )

    if (confirmed) {
      const doubleConfirm = await dialogs.showConfirm('本当にすべてのデータを削除しますか？', '最終確認: すべてのデータが完全に削除されます。')

      if (doubleConfirm) {
        try {
          loading.value = true
          const success = await database.clearAllData()

          if (success) {
            await refreshStats()
            dialogs.showAlert('すべてのデータを削除しました')
            // ページをリロードして初期状態に戻す
            window.location.reload()
          } else {
            dialogs.showAlert('データの削除に失敗しました')
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          dialogs.showAlert(`削除中にエラーが発生しました: ${message}`)
          logger.error('全データ削除エラー:', { component: 'useDataManagement' }, error)
        } finally {
          loading.value = false
        }
      }
    }
  }

  const refreshStats = async () => {
    await database.refreshStats()
    stats.value = database.stats.value
  }

  const initialize = async () => {
    await refreshStats()
    await storageQuota.getStorageQuota()
  }

  return {
    loading,
    stats,
    importResult,
    importOptions,
    databaseSize,
    storageQuota,

    exportFullBackup,
    exportChatsOnly,

    processFile,
    updateImportOptions,
    clearImportResult,

    confirmClearChats,
    confirmClearAllData,

    refreshStats,
    initialize,
  }
}
