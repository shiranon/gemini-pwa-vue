import { computed, onUnmounted, readonly, ref, watch } from 'vue'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfileData } from '~/types/settings'
import { logger } from '~/lib/logger'

/**
 * プロファイル設定専用のコンポーザブル
 * プロファイル固有の設定のみを扱う
 */
export function useProfileSettings() {
  const profilesStore = useSettingsProfilesStore()

  // ローカルの編集用プロファイル設定
  const localProfileSettings = ref<SettingsProfileData>({
    apiProvider: 'gemini',
    modelName: '',
    systemPrompt: '',
    maxTokens: null,
    temperature: null,
    topK: null,
    topP: null,
    presencePenalty: null,
    frequencyPenalty: null,
    thinkingBudget: null,
    enableExtendedThinking: false,
    geminiEnableFunctionCalling: false,
    functionCallingMode: 'auto',
    enabledFunctionTools: [],
    geminiEnableGrounding: false,
    enableDummyUserPrompt: false,
    dummyUserPrompt: '',
    enableDummyModelPrompt: false,
    dummyModelPrompt: '',
    prependDummyModelToResponse: false,
    profileImage: undefined,
  })

  // 編集前のプロファイル設定のスナップショット
  const originalProfileSettings = ref<SettingsProfileData | null>(null)

  // 保存中フラグ
  const saving = ref(false)

  // 現在のプロファイルがあるか
  const hasActiveProfile = computed(() => !!profilesStore.activeProfile)

  // ダーティフラグ：プロファイル設定が変更されたか
  const isDirty = computed(() => {
    if (!originalProfileSettings.value) return false

    // 各フィールドを比較
    for (const key of Object.keys(localProfileSettings.value) as Array<keyof SettingsProfileData>) {
      if (key === 'enabledFunctionTools') {
        const local = localProfileSettings.value.enabledFunctionTools
        const original = originalProfileSettings.value.enabledFunctionTools
        if (local.length !== original.length) return true
        if (!local.every((tool) => original.includes(tool))) return true
      } else if (localProfileSettings.value[key] !== originalProfileSettings.value[key]) {
        return true
      }
    }
    return false
  })

  /**
   * アクティブプロファイルから設定を読み込む
   */
  const loadFromActiveProfile = () => {
    if (!profilesStore.activeProfile) {
      logger.warn('アクティブプロファイルがありません。デフォルト設定を使用します。')

      // プロファイルが存在しない場合はデフォルト設定を使用
      const defaultSettings = profilesStore.defaultProfileSettings
      localProfileSettings.value = {
        ...defaultSettings,
        enabledFunctionTools: [...defaultSettings.enabledFunctionTools],
      }

      originalProfileSettings.value = {
        ...defaultSettings,
        enabledFunctionTools: [...defaultSettings.enabledFunctionTools],
      }

      return
    }

    const profileSettings = profilesStore.activeProfile.settings
    localProfileSettings.value = {
      ...profileSettings,
      enabledFunctionTools: [...profileSettings.enabledFunctionTools],
    }

    // オリジナル設定を保存（プロファイル切り替え時にリセット）
    originalProfileSettings.value = {
      ...profileSettings,
      enabledFunctionTools: [...profileSettings.enabledFunctionTools],
    }
  }

  /**
   * プロファイル設定を更新
   */
  const updateSetting = <K extends keyof SettingsProfileData>(key: K, value: SettingsProfileData[K]) => {
    if (key === 'enabledFunctionTools' && Array.isArray(value)) {
      localProfileSettings.value = {
        ...localProfileSettings.value,
        [key]: [...value],
      }
    } else {
      localProfileSettings.value = {
        ...localProfileSettings.value,
        [key]: value,
      }
    }

    if (typeof logger.debug === 'function') {
      logger.debug(`プロファイル設定を更新: ${key}`, { value })
    }
  }

  /**
   * プロファイル設定を保存
   */
  const saveProfileSettings = async () => {
    if (!profilesStore.activeProfile) {
      logger.error('保存するアクティブプロファイルがありません')
      return
    }

    try {
      saving.value = true

      await profilesStore.updateProfile(profilesStore.activeProfile.id, {
        settings: localProfileSettings.value,
      })

      // 保存後、オリジナル設定を更新
      originalProfileSettings.value = {
        ...localProfileSettings.value,
        enabledFunctionTools: [...localProfileSettings.value.enabledFunctionTools],
      }

      logger.info('プロファイル設定を保存しました', {
        profileId: profilesStore.activeProfile.id,
      })
    } catch (error) {
      logger.error('プロファイル設定の保存に失敗', { component: 'useProfileSettings' }, error)
      throw error
    } finally {
      saving.value = false
    }
  }

  /**
   * 変更を破棄して元に戻す
   */
  const resetChanges = () => {
    if (!originalProfileSettings.value) return

    localProfileSettings.value = {
      ...originalProfileSettings.value,
      enabledFunctionTools: [...originalProfileSettings.value.enabledFunctionTools],
    }

    logger.info('プロファイル設定の変更を破棄しました')
  }

  /**
   * プロファイル設定をデフォルト値にリセット
   */
  const resetToDefaults = () => {
    if (!profilesStore.activeProfile) {
      logger.warn('リセットするアクティブプロファイルがありません')
      return
    }

    // デフォルトプロファイル設定を取得
    const defaultSettings = profilesStore.defaultProfileSettings

    localProfileSettings.value = {
      ...defaultSettings,
      enabledFunctionTools: [...defaultSettings.enabledFunctionTools],
    }

    logger.info('プロファイル設定をデフォルト値にリセットしました', {
      profileId: profilesStore.activeProfile.id,
    })
  }

  // watcherの参照を保持してクリーンアップ用
  const watchers: Array<() => void> = []

  // アクティブプロファイルが変更されたら設定を読み込む
  const stopActiveProfileWatcher = watch(
    () => profilesStore.activeProfile,
    (newProfile) => {
      if (newProfile) {
        loadFromActiveProfile()
      }
    },
    { immediate: true }
  )
  watchers.push(stopActiveProfileWatcher)

  // Function Calling と Google Search の排他制御
  const stopFunctionCallingWatcher = watch(
    () => localProfileSettings.value.geminiEnableFunctionCalling,
    (newValue, oldValue) => {
      if (newValue !== oldValue && newValue && localProfileSettings.value.geminiEnableGrounding) {
        updateSetting('geminiEnableGrounding', false)
        if (typeof logger.debug === 'function') {
          logger.debug('Function Calling有効化によりGroundingを無効化')
        }
      }
    }
  )
  watchers.push(stopFunctionCallingWatcher)

  const stopGroundingWatcher = watch(
    () => localProfileSettings.value.geminiEnableGrounding,
    (newValue, oldValue) => {
      if (newValue !== oldValue && newValue && localProfileSettings.value.geminiEnableFunctionCalling) {
        updateSetting('geminiEnableFunctionCalling', false)
        if (typeof logger.debug === 'function') {
          logger.debug('Grounding有効化によりFunction Callingを無効化')
        }
      }
    }
  )
  watchers.push(stopGroundingWatcher)

  // クリーンアップ処理
  onUnmounted(() => {
    watchers.forEach((stop) => stop())
    logger.debug('[Profile Settings] watchersをクリーンアップしました', { component: 'useProfileSettings' })
  })

  /**
   * プロファイル設定を更新（一時的な変更）
   */
  const updateProfileSetting = <K extends keyof SettingsProfileData>(key: K, value: SettingsProfileData[K]) => {
    if (key === 'enabledFunctionTools' && Array.isArray(value)) {
      localProfileSettings.value = {
        ...localProfileSettings.value,
        [key]: [...value],
      }
    } else {
      localProfileSettings.value = {
        ...localProfileSettings.value,
        [key]: value,
      }
    }
    logger.info(`[Profile Settings] 一時的な設定変更: ${key}`, { component: 'useProfileSettings' })
  }

  /**
   * ローカル設定をリセット
   */
  const resetLocalProfileSettings = () => {
    loadFromActiveProfile()
    logger.info('[Profile Settings] ローカル設定をリセットしました', { component: 'useProfileSettings' })
  }

  return {
    // 状態
    localProfileSettings: readonly(localProfileSettings),
    isDirty: readonly(isDirty),
    saving: readonly(saving),
    hasActiveProfile: readonly(hasActiveProfile),

    // 操作
    updateSetting,
    saveProfileSettings,
    resetChanges,
    resetToDefaults,
    loadFromActiveProfile,
    updateProfileSetting,
    resetLocalProfileSettings,
  }
}
