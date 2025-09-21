import { computed, ref, watch } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import type { AppSettings } from '~/types/settings'
import { areSettingsEqual } from '~/utils/settings'

// ダイアログ関数の型定義
interface DialogFunctions {
  showAlert: (message: string, title?: string, description?: string) => void
  showConfirm: (message: string, title?: string, description?: string) => Promise<boolean>
}

/**
 * 設定ページ用のコンポーザブル
 * 設定の管理、バリデーション、保存・リセット機能を提供
 */
export function useSettings(dialogs: DialogFunctions) {
  const settingsStore = useSettingsStore()

  const cloneSettings = (settings: AppSettings): AppSettings => ({
    ...settings,
    enabledFunctionTools: [...(settings.enabledFunctionTools ?? [])],
  })

  const localSettings = ref<AppSettings>(cloneSettings(settingsStore.settings))
  const saving = ref(false)

  const isDirty = computed(() => !areSettingsEqual(localSettings.value, settingsStore.settings))

  const isValidApiKey = computed(() => {
    return localSettings.value.apiKey.length > 0
  })

  const lastSavedAt = computed(() => settingsStore.lastSavedAt)

  const formatLastSaved = computed(() => {
    if (!lastSavedAt.value) return ''
    const date = new Date(lastSavedAt.value)
    return date.toLocaleString('ja-JP')
  })

  const saveSettings = async () => {
    try {
      saving.value = true
      settingsStore.updateSettings(localSettings.value)
      await settingsStore.saveSettings()
      dialogs.showAlert('設定を保存しました')
    } catch (error) {
      dialogs.showAlert('設定の保存に失敗しました')
      logger.error('設定の保存エラー:', { component: 'useSettings' }, error)
    } finally {
      saving.value = false
    }
  }

  const resetToDefaults = async () => {
    const confirmed = await dialogs.showConfirm('すべての設定がデフォルト値に戻ります。この操作は取り消せません。', '設定をリセットしますか？', 'デフォルトにリセットされます。')

    if (confirmed) {
      try {
        settingsStore.resetToDefaults()
        await settingsStore.saveSettings()
        localSettings.value = cloneSettings(settingsStore.settings)
        dialogs.showAlert('設定をリセットしました')
      } catch (error) {
        dialogs.showAlert('設定のリセットに失敗しました')
        logger.error('設定のリセットエラー:', { component: 'useSettings' }, error)
      }
    }
  }

  const syncLocalSettings = () => {
    localSettings.value = cloneSettings(settingsStore.settings)
  }

  const updateLocalSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (key === 'enabledFunctionTools' && Array.isArray(value)) {
      localSettings.value = { ...localSettings.value, [key]: [...value] }
    } else {
      localSettings.value = { ...localSettings.value, [key]: value }
    }
  }

  watch(
    () => settingsStore.settings,
    (newSettings) => {
      // 無限ループを避けるため、実際に変更があった場合のみ更新
      if (JSON.stringify(localSettings.value) !== JSON.stringify(newSettings)) {
        localSettings.value = cloneSettings(newSettings)
      }
    },
    { deep: true }
  )

  watch(
    () => localSettings.value.geminiEnableFunctionCalling,
    (newValue, oldValue) => {
      if (newValue !== oldValue && newValue && localSettings.value.geminiEnableGrounding) {
        localSettings.value.geminiEnableGrounding = false
      }
    }
  )

  watch(
    () => localSettings.value.geminiEnableGrounding,
    (newValue, oldValue) => {
      if (newValue !== oldValue && newValue && localSettings.value.geminiEnableFunctionCalling) {
        localSettings.value.geminiEnableFunctionCalling = false
      }
    }
  )

  watch(
    () => localSettings.value.includeThoughts,
    (newValue, oldValue) => {
      if (newValue !== oldValue && !newValue && localSettings.value.enableThoughtTranslation) {
        localSettings.value.enableThoughtTranslation = false
      }
    }
  )

  return {
    localSettings,
    saving,

    isDirty,
    isValidApiKey,
    lastSavedAt,
    formatLastSaved,

    saveSettings,
    resetToDefaults,
    syncLocalSettings,
    updateLocalSetting,
  }
}
