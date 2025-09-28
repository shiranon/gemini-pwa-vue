import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { loadSettingsProfiles as loadProfilesFromDB, saveSettingsProfiles as saveProfilesToDB } from '~/lib/database'
import type { AppSettings, SettingsProfile, SettingsProfileData } from '~/types/settings'
import { DEFAULT_SETTINGS } from '~/types/settings'
import { logger } from '~/utils/logger'
import type { ProfileSettingKey } from '~/utils/settingsPartition'
import { cloneProfileSettings, extractProfileSettings, mergeProfilePartial } from '~/utils/settingsPartition'

export const useSettingsProfilesStore = defineStore('settingsProfiles', () => {
  const profiles = ref<SettingsProfile[]>([])
  const activeProfileId = ref<string | null>(null)
  const isLoading = ref(false)
  const isDirty = ref(false)

  // 一時的な設定変更を管理
  const temporarySettings = ref<Partial<SettingsProfileData>>({})

  // Function Callingの管理
  const { setFunctionEnablement } = useFunctionCalling()

  const activeProfile = computed(() => {
    if (!activeProfileId.value) return null
    return profiles.value.find((p) => p.id === activeProfileId.value) || null
  })

  // 一時的な設定を含むアクティブプロファイル設定
  const activeProfileSettingsWithTemporary = computed(() => {
    const profile = activeProfile.value
    if (!profile) return defaultProfileSettings

    return {
      ...profile.settings,
      ...temporarySettings.value,
    }
  })

  const sortedProfiles = computed(() => {
    return [...profiles.value].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return a.name.localeCompare(b.name)
    })
  })

  const defaultProfileSettings = extractProfileSettings(DEFAULT_SETTINGS)

  const extractProfileData = (settings: AppSettings): SettingsProfileData => {
    return cloneProfileSettings(extractProfileSettings(settings))
  }

  const sanitizeImportedProfileSettings = (data: Record<string, unknown>): SettingsProfileData => {
    return mergeProfilePartial(defaultProfileSettings, data as Partial<Record<ProfileSettingKey, unknown>>)
  }

  const createProfile = async (name: string, description: string, settings: AppSettings, isDefault = false): Promise<SettingsProfile> => {
    const profile: SettingsProfile = {
      id: crypto.randomUUID(),
      name,
      description,
      settings: extractProfileData(settings),
      isDefault,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    profiles.value.push(profile)
    await saveProfiles()

    logger.info('プロファイルを作成しました', { profileId: profile.id, name: profile.name })
    return profile
  }

  const updateProfile = async (profileId: string, updates: Partial<{ name: string; description: string; settings: AppSettings | SettingsProfileData }>) => {
    const profile = profiles.value.find((p) => p.id === profileId)
    if (!profile) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    if (updates.name !== undefined) profile.name = updates.name
    if (updates.description !== undefined) profile.description = updates.description
    if (updates.settings) {
      // settingsがAppSettingsかSettingsProfileDataかを判定
      if ('apiKey' in updates.settings) {
        // AppSettingsの場合
        profile.settings = extractProfileData(updates.settings as AppSettings)
      } else {
        // SettingsProfileDataの場合
        profile.settings = cloneProfileSettings(updates.settings as SettingsProfileData)
      }
    }
    profile.updatedAt = Date.now()

    await saveProfiles()
    logger.info('プロファイルを更新しました', { profileId, updates })
  }

  const updateProfileImage = async (profileId: string, imageUrl: string | null) => {
    const profile = profiles.value.find((p) => p.id === profileId)
    if (!profile) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    profile.settings.profileImage = imageUrl || undefined
    profile.updatedAt = Date.now()
    isDirty.value = true

    await saveProfiles()
    isDirty.value = false
    logger.info('プロファイル画像を更新しました', { profileId, hasImage: !!imageUrl })
  }

  const deleteProfile = async (profileId: string) => {
    const index = profiles.value.findIndex((p) => p.id === profileId)
    if (index === -1) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    const profile = profiles.value[index]
    if (!profile) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    if (profile.isDefault) {
      throw new Error('デフォルトプロファイルは削除できません')
    }

    profiles.value.splice(index, 1)

    if (activeProfileId.value === profileId) {
      activeProfileId.value = null
    }

    await saveProfiles()
    logger.info('プロファイルを削除しました', { profileId, name: profile.name })
  }

  const duplicateProfile = async (profileId: string, newName: string): Promise<SettingsProfile> => {
    const source = profiles.value.find((p) => p.id === profileId)
    if (!source) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    const duplicate: SettingsProfile = {
      id: crypto.randomUUID(),
      name: newName,
      description: source.description,
      settings: cloneProfileSettings(source.settings),
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    profiles.value.push(duplicate)
    await saveProfiles()

    logger.info('プロファイルを複製しました', { sourceId: profileId, duplicateId: duplicate.id })
    return duplicate
  }

  const setActiveProfile = (profileId: string | null) => {
    if (profileId && !profiles.value.find((p) => p.id === profileId)) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    // プロファイルが変更される前に一時的な設定をクリア
    if (activeProfileId.value !== profileId) {
      clearTemporarySettings()
    }

    activeProfileId.value = profileId
    logger.info('アクティブプロファイルを変更', { profileId })
  }

  const applyProfileToSettings = (profileId: string): Partial<AppSettings> => {
    const profile = profiles.value.find((p) => p.id === profileId)
    if (!profile) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    setActiveProfile(profileId)
    return cloneProfileSettings(profile.settings)
  }

  const saveProfiles = async () => {
    try {
      isLoading.value = true
      const result = await saveProfilesToDB(profiles.value, activeProfileId.value)
      if (!result.success) {
        throw new Error(result.error || 'プロファイルの保存に失敗')
      }
    } catch (error) {
      logger.error('プロファイルの保存エラー:', { component: 'settingsProfiles' }, error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const loadProfiles = async () => {
    try {
      isLoading.value = true
      const result = await loadProfilesFromDB()

      if (result.success && result.data) {
        profiles.value = result.data.profiles
        activeProfileId.value = result.data.activeProfileId

        if (profiles.value.length === 0) {
          await createDefaultProfile()
        }
      } else {
        await createDefaultProfile()
      }
    } catch (error) {
      logger.error('プロファイルの読み込みエラー:', { component: 'settingsProfiles' }, error)
      await createDefaultProfile()
    } finally {
      isLoading.value = false
    }
  }

  const createDefaultProfile = async () => {
    const defaultProfile = await createProfile('デフォルト', 'デフォルトの設定プロファイル', DEFAULT_SETTINGS, true)
    setActiveProfile(defaultProfile.id)
  }

  const exportProfile = (profileId: string): string => {
    const profile = profiles.value.find((p) => p.id === profileId)
    if (!profile) {
      throw new Error(`プロファイルが見つかりません: ${profileId}`)
    }

    const exportData = {
      ...profile,
      id: undefined,
      isDefault: false,
      exportedAt: Date.now(),
    }

    return JSON.stringify(exportData, null, 2)
  }

  const importProfile = async (jsonData: string): Promise<SettingsProfile> => {
    try {
      const importData = JSON.parse(jsonData)

      if (!importData.name || !importData.settings) {
        throw new Error('無効なプロファイルデータです')
      }

      const profile: SettingsProfile = {
        id: crypto.randomUUID(),
        name: importData.name,
        description: importData.description || '',
        settings: sanitizeImportedProfileSettings(importData.settings as Record<string, unknown>),
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      profiles.value.push(profile)
      await saveProfiles()

      logger.info('プロファイルをインポートしました', { profileId: profile.id, name: profile.name })
      return profile
    } catch (error) {
      logger.error('プロファイルのインポートエラー:', { component: 'settingsProfiles' }, error)
      throw new Error('プロファイルのインポートに失敗しました')
    }
  }

  // 一時的な設定を更新
  const updateTemporarySetting = <K extends keyof SettingsProfileData>(key: K, value: SettingsProfileData[K]) => {
    temporarySettings.value = {
      ...temporarySettings.value,
      [key]: value,
    }
    logger.info(`[Profile Store] 一時的な設定を更新: ${key}`, { value })

    // Function Calling と Google Search の排他制御
    if (key === 'geminiEnableFunctionCalling' && value === true) {
      const currentSettings = activeProfileSettingsWithTemporary.value
      if (currentSettings.geminiEnableGrounding) {
        temporarySettings.value = {
          ...temporarySettings.value,
          geminiEnableGrounding: false,
        }
        logger.info('[Profile Store] Function Calling有効化によりGroundingを無効化')
      }
    } else if (key === 'geminiEnableGrounding' && value === true) {
      const currentSettings = activeProfileSettingsWithTemporary.value
      if (currentSettings.geminiEnableFunctionCalling) {
        temporarySettings.value = {
          ...temporarySettings.value,
          geminiEnableFunctionCalling: false,
        }
        logger.info('[Profile Store] Grounding有効化によりFunction Callingを無効化')
      }
    }
  }

  // 一時的な設定をクリア
  const clearTemporarySettings = () => {
    temporarySettings.value = {}
    logger.info('[Profile Store] 一時的な設定をクリアしました')
  }

  // プロファイル設定のenabledFunctionToolsを監視してFunction Callingを更新
  watch(
    () => activeProfileSettingsWithTemporary.value.enabledFunctionTools,
    (enabledNames) => {
      if (enabledNames && enabledNames.length > 0) {
        setFunctionEnablement([...enabledNames])
        logger.info('[Profile Store] Function Calling設定を更新', { enabledNames })
      }
    },
    { immediate: true }
  )

  const initialize = async () => {
    await loadProfiles()
    logger.info('プロファイルストアを初期化', { component: 'settingsProfiles' }, { profileCount: profiles.value.length })
  }

  return {
    profiles,
    activeProfileId,
    isLoading,
    isDirty,
    activeProfile,
    activeProfileSettingsWithTemporary,
    sortedProfiles,
    defaultProfileSettings,

    createProfile,
    updateProfile,
    updateProfileImage,
    deleteProfile,
    duplicateProfile,
    setActiveProfile,
    applyProfileToSettings,
    saveProfiles,
    exportProfile,
    importProfile,
    updateTemporarySetting,
    clearTemporarySettings,

    initialize,
  }
})
