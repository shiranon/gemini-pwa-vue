import { computed, ref, watch } from 'vue'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfileData } from '~/types/settings'
import { logger } from '~/utils/logger'

/**
 * プロファイル設定専用のコンポーザブル
 * プロファイル固有の設定のみを扱う
 */
export function useProfileSettings() {
  const profilesStore = useSettingsProfilesStore()

  // ローカルの編集用プロファイル設定
  const localProfileSettings = ref<SettingsProfileData>({
    modelName: '',
    systemPrompt: '',
    maxTokens: null,
    temperature: null,
    topK: null,
    topP: null,
    presencePenalty: null,
    frequencyPenalty: null,
    thinkingBudget: null,
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
      logger.warn('アクティブプロファイルがありません')
      return
    }

    const profileSettings = profilesStore.activeProfile.settings
    localProfileSettings.value = {
      ...profileSettings,
      enabledFunctionTools: [...profileSettings.enabledFunctionTools],
    }

    // オリジナル設定を保存
    originalProfileSettings.value = {
      ...profileSettings,
      enabledFunctionTools: [...profileSettings.enabledFunctionTools],
    }

    logger.info('プロファイル設定を読み込みました', {
      profileId: profilesStore.activeProfile.id,
      profileName: profilesStore.activeProfile.name,
    })
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

    logger.debug(`プロファイル設定を更新: ${key}`, { value })
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

  // アクティブプロファイルが変更されたら設定を読み込む
  watch(
    () => profilesStore.activeProfile,
    (newProfile) => {
      if (newProfile) {
        loadFromActiveProfile()
      }
    },
    { immediate: true }
  )

  // Function Calling と Google Search の排他制御
  watch(
    () => localProfileSettings.value.geminiEnableFunctionCalling,
    (newValue, oldValue) => {
      if (newValue !== oldValue && newValue && localProfileSettings.value.geminiEnableGrounding) {
        localProfileSettings.value.geminiEnableGrounding = false
        logger.debug('Function Calling有効化によりGroundingを無効化')
      }
    }
  )

  watch(
    () => localProfileSettings.value.geminiEnableGrounding,
    (newValue, oldValue) => {
      if (newValue !== oldValue && newValue && localProfileSettings.value.geminiEnableFunctionCalling) {
        localProfileSettings.value.geminiEnableFunctionCalling = false
        logger.debug('Grounding有効化によりFunction Callingを無効化')
      }
    }
  )

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
    loadFromActiveProfile,
  }
}
