import { computed, ref, watch } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import type { AppSettings } from '~/types/settings'
import { logger } from '~/utils/logger'
import { extractGlobalSettings } from '~/utils/settingsPartition'
import type { GlobalSettingKey } from '~/utils/settingsPartition'

// ダイアログ関数の型定義
interface DialogFunctions {
  showAlert: (message: string, title?: string, description?: string) => void
  showConfirm: (message: string, title?: string, description?: string) => Promise<boolean>
}

/**
 * グローバル設定専用のコンポーザブル
 * プロファイルに依存しない設定のみを扱う
 */
export function useSettings(dialogs: DialogFunctions) {
  const settingsStore = useSettingsStore()

  // ローカルのグローバル設定
  const localSettings = ref<AppSettings>({ ...settingsStore.settings })

  // 保存中フラグ
  const saving = ref(false)

  // ダーティフラグ：設定が変更されたか
  const isDirty = computed(() => {
    const currentGlobal = extractGlobalSettings(settingsStore.settings)
    const localGlobal = extractGlobalSettings(localSettings.value)

    for (const key of Object.keys(currentGlobal) as GlobalSettingKey[]) {
      const currentValue = currentGlobal[key]
      const localValue = localGlobal[key]

      if (typeof currentValue === 'object' && currentValue !== null) {
        if (JSON.stringify(currentValue) !== JSON.stringify(localValue)) {
          return true
        }
      } else if (currentValue !== localValue) {
        return true
      }
    }
    return false
  })

  // APIキー検証
  const isValidApiKey = computed(() => {
    return localSettings.value.apiKey?.length > 0
  })

  // 最終保存時刻
  const lastSavedAt = computed(() => settingsStore.lastSavedAt)

  // 最終保存時刻フォーマット
  const formatLastSaved = computed(() => {
    if (!lastSavedAt.value) return ''
    const date = new Date(lastSavedAt.value)
    return date.toLocaleString('ja-JP')
  })

  /**
   * グローバル設定を更新
   */
  const updateLocalSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    localSettings.value = { ...localSettings.value, [key]: value }
    logger.debug(`グローバル設定を更新: ${key}`, { value })
  }

  /**
   * グローバル設定を保存
   */
  const saveSettings = async () => {
    try {
      saving.value = true
      settingsStore.updateSettings(localSettings.value)
      await settingsStore.saveSettings(true) // プロファイル更新をスキップ
      logger.info('グローバル設定を保存しました')
    } catch (error) {
      dialogs.showAlert('設定の保存に失敗しました')
      logger.error('グローバル設定の保存エラー', { component: 'useSettings' }, error)
      throw error
    } finally {
      saving.value = false
    }
  }

  /**
   * デフォルト設定にリセット
   */
  const resetToDefaults = async () => {
    const confirmed = await dialogs.showConfirm('すべての設定がデフォルト値に戻ります。この操作は取り消せません。', '設定をリセットしますか？', 'デフォルトにリセットされます。')

    if (confirmed) {
      try {
        await settingsStore.resetToDefaults()
        await settingsStore.saveSettings(true) // プロファイル更新をスキップ
        syncLocalSettings()
        dialogs.showAlert('設定をリセットしました')
      } catch (error) {
        dialogs.showAlert('設定のリセットに失敗しました')
        logger.error('設定のリセットエラー', { component: 'useSettings' }, error)
      }
    }
  }

  /**
   * ストア設定と同期
   */
  const syncLocalSettings = () => {
    localSettings.value = { ...settingsStore.settings }
  }

  // ストア設定の変更を監視して同期
  watch(
    () => settingsStore.settings,
    (newSettings) => {
      localSettings.value = { ...newSettings }
    },
    { deep: true }
  )

  // Thought Translation の制御
  watch(
    () => localSettings.value.includeThoughts,
    (newValue, oldValue) => {
      if (newValue !== oldValue && !newValue && localSettings.value.enableThoughtTranslation) {
        localSettings.value.enableThoughtTranslation = false
      }
    }
  )

  return {
    // 状態
    localSettings: readonly(localSettings),
    saving: readonly(saving),
    isDirty: readonly(isDirty),
    isValidApiKey: readonly(isValidApiKey),
    lastSavedAt: readonly(lastSavedAt),
    formatLastSaved: readonly(formatLastSaved),

    // 操作
    updateLocalSetting,
    saveSettings,
    resetToDefaults,
    syncLocalSettings,
  }
}
