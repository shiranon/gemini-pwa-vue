import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { loadSettings as loadSettingsFromDB, saveSettings as saveSettingsToDB } from '~/lib/database'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { GeminiApiSettings } from '~/types/chat'
import type { AppSettings } from '~/types/settings'
import { DEFAULT_SETTINGS } from '~/types/settings'
import { clamp } from '~/utils/calc'
import { logger } from '~/utils/logger'
import { extractProfileSettings } from '~/utils/settingsPartition'
import { applyTheme, getThemePreset } from '~/utils/theme'

const cloneEnabledFunctionTools = (toolNames?: string[]) => {
  const source = Array.isArray(toolNames) ? toolNames : DEFAULT_SETTINGS.enabledFunctionTools
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of source) {
    if (typeof name !== 'string' || name.length === 0) continue
    if (seen.has(name)) continue
    seen.add(name)
    result.push(name)
  }
  return result
}

const getImageMargins = (justify: 'start' | 'center' | 'end') => {
  switch (justify) {
    case 'center':
      return { start: 'auto', end: 'auto' }
    case 'end':
      return { start: 'auto', end: '0' }
    case 'start':
    default:
      return { start: '0', end: 'auto' }
  }
}

const createSettingsState = (base: Partial<AppSettings> = {}): AppSettings => {
  const merged = { ...DEFAULT_SETTINGS, ...base } as AppSettings
  return {
    ...merged,
    enabledFunctionTools: cloneEnabledFunctionTools(merged.enabledFunctionTools),
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(createSettingsState())
  const isLoading = ref(false)
  const lastSavedAt = ref<number | null>(null)
  const isDirty = ref(false)

  const { setFunctionEnablement } = useFunctionCalling()

  const apiConfig = computed(() => ({
    apiKey: settings.value.apiKey,
    modelName: settings.value.modelName,
    streamingSpeed: settings.value.streamingSpeed,
    systemPrompt: settings.value.systemPrompt,
  }))

  const apiSettings = computed<GeminiApiSettings>(() => ({
    apiKey: settings.value.apiKey,
    model: settings.value.modelName,
    temperature: settings.value.temperature ?? 1.0,
    maxTokens: settings.value.maxTokens,
    topK: settings.value.topK ?? 1,
    topP: settings.value.topP ?? 0.95,
    systemPrompt: settings.value.systemPrompt,
    streamingOutput: settings.value.streamingOutput,
    enableThinking: settings.value.enableThinking,
    includeThoughts: settings.value.includeThoughts,
    thinkingBudget: settings.value.thinkingBudget,
    geminiEnableGrounding: settings.value.geminiEnableGrounding,
    enableThoughtTranslation: settings.value.enableThoughtTranslation,
    thoughtTranslationProvider: settings.value.thoughtTranslationProvider,
    thoughtTranslationModel: settings.value.thoughtTranslationModel,
    deeplApiKey: settings.value.deeplApiKey,
    enableProofreading: settings.value.enableProofreading,
    proofreadingModelName: settings.value.proofreadingModelName,
    proofreadingSystemInstruction: settings.value.proofreadingSystemInstruction,
    functionCalling: settings.value.geminiEnableFunctionCalling
      ? {
          enabled: true,
          mode: settings.value.functionCallingMode,
          ...(settings.value.functionCallingMode === 'any' && settings.value.enabledFunctionTools.length > 0 ? { allowedFunctionNames: [...settings.value.enabledFunctionTools] } : {}),
        }
      : undefined,
    // ダミープロンプト設定（送信時のみ適用）
    enableDummyUserPrompt: settings.value.enableDummyUserPrompt,
    dummyUserPrompt: settings.value.dummyUserPrompt,
    enableDummyModelPrompt: settings.value.enableDummyModelPrompt,
    dummyModelPrompt: settings.value.dummyModelPrompt,
    prependDummyModelToResponse: settings.value.prependDummyModelToResponse,
  }))

  const geminiParameters = computed(() => ({
    maxTokens: settings.value.maxTokens,
    temperature: settings.value.temperature,
    topK: settings.value.topK,
    topP: settings.value.topP,
    presencePenalty: settings.value.presencePenalty,
    frequencyPenalty: settings.value.frequencyPenalty,
    thinkingBudget: settings.value.thinkingBudget,
  }))

  const advancedSettings = computed(() => ({
    streamingOutput: settings.value.streamingOutput,
    enableThinking: settings.value.enableThinking,
    includeThoughts: settings.value.includeThoughts,
    geminiEnableFunctionCalling: settings.value.geminiEnableFunctionCalling,
    geminiEnableGrounding: settings.value.geminiEnableGrounding,
  }))

  const thoughtTranslationSettings = computed(() => ({
    enableThoughtTranslation: settings.value.enableThoughtTranslation,
    thoughtTranslationProvider: settings.value.thoughtTranslationProvider,
    thoughtTranslationModel: settings.value.thoughtTranslationModel,
    deeplApiKey: settings.value.deeplApiKey,
  }))

  const retrySettings = computed(() => ({
    enableAutoRetry: settings.value.enableAutoRetry,
    maxRetries: settings.value.maxRetries,
    useFixedRetryDelay: settings.value.useFixedRetryDelay,
    fixedRetryDelaySeconds: settings.value.fixedRetryDelaySeconds,
    maxBackoffDelaySeconds: settings.value.maxBackoffDelaySeconds,
  }))

  const proofreadingSettings = computed(() => ({
    enableProofreading: settings.value.enableProofreading,
    proofreadingModelName: settings.value.proofreadingModelName,
    proofreadingSystemInstruction: settings.value.proofreadingSystemInstruction,
  }))

  const themeSettings = computed(() => {
    return {
      themePreset: settings.value.themePreset,
      fontFamily: settings.value.fontFamily,
      fontMode: settings.value.fontMode,
      systemFontName: settings.value.systemFontName,
      selectedPreset: settings.value.selectedPreset,
      messageFontSize: settings.value.messageFontSize,
      functionCallFontSize: settings.value.functionCallFontSize,
      thoughtFontSize: settings.value.thoughtFontSize,
      messageBubbleRadius: settings.value.messageBubbleRadius,
      messageBubblePaddingX: settings.value.messageBubblePaddingX,
      messageBubblePaddingY: settings.value.messageBubblePaddingY,
      messageImageWidthPercent: settings.value.messageImageWidthPercent,
      messageImageJustify: settings.value.messageImageJustify,
      userBubbleColor: settings.value.userBubbleColor,
      assistantBubbleColor: settings.value.assistantBubbleColor,
    }
  })

  const messageAppearanceSettings = computed(() => ({
    fontFamily: settings.value.fontFamily,
    messageFontSize: settings.value.messageFontSize,
    functionCallFontSize: settings.value.functionCallFontSize,
    thoughtFontSize: settings.value.thoughtFontSize,
    bubbleRadius: settings.value.messageBubbleRadius,
    bubblePaddingX: settings.value.messageBubblePaddingX,
    bubblePaddingY: settings.value.messageBubblePaddingY,
    imageWidthPercent: settings.value.messageImageWidthPercent,
    imageJustify: settings.value.messageImageJustify,
    userBubbleColor: settings.value.userBubbleColor,
    assistantBubbleColor: settings.value.assistantBubbleColor,
    opacity: settings.value.messageOpacity,
  }))

  const backgroundSettings = computed(() => ({
    backgroundImageBlob: settings.value.backgroundImageBlob,
    backgroundImageDataUrl: settings.value.backgroundImageDataUrl,
    overlayColor: settings.value.overlayColor,
    overlayOpacity: settings.value.overlayOpacity,
    messageOpacity: settings.value.messageOpacity,
  }))

  const navigationSettings = computed(() => ({
    enterToSend: settings.value.enterToSend,
    enableSwipeNavigation: settings.value.enableSwipeNavigation,
    hideSystemPromptInChat: settings.value.hideSystemPromptInChat,
  }))

  const avatarSettings = computed(() => ({
    enabled: settings.value.avatarEnabled,
    size: settings.value.avatarSize,
    defaultUserAvatar: settings.value.defaultUserAvatar,
    defaultAssistantAvatar: settings.value.defaultAssistantAvatar,
  }))

  if (import.meta.client) {
    watch(
      () => ({
        fontFamily: settings.value.fontFamily,
        messageFontSize: settings.value.messageFontSize,
        functionCallFontSize: settings.value.functionCallFontSize,
        thoughtFontSize: settings.value.thoughtFontSize,
        bubbleRadius: settings.value.messageBubbleRadius,
        paddingX: settings.value.messageBubblePaddingX,
        paddingY: settings.value.messageBubblePaddingY,
        imageWidthPercent: settings.value.messageImageWidthPercent,
        imageJustify: settings.value.messageImageJustify,
        userBg: settings.value.userBubbleColor,
        assistantBg: settings.value.assistantBubbleColor,
      }),
      () => applyAppearanceVariables(settings.value),
      { immediate: true }
    )

    watch(
      () => settings.value.themePreset,
      (preset) => {
        const theme = getThemePreset(preset)
        settings.value.userBubbleColor = theme.userBubbleColor
        settings.value.assistantBubbleColor = theme.assistantBubbleColor
        applyTheme(preset)
      },
      { immediate: true }
    )
  }

  watch(
    () => settings.value.enabledFunctionTools,
    (enabledNames) => {
      setFunctionEnablement(cloneEnabledFunctionTools(enabledNames))
    },
    { immediate: true }
  )

  const isValidApiKey = computed(() => {
    return settings.value.apiKey.length > 0
  })

  const isValidConfiguration = computed(() => {
    return isValidApiKey.value && settings.value.modelName.length > 0
  })

  const canUseAdvancedFeatures = computed(() => {
    return isValidConfiguration.value && (settings.value.geminiEnableFunctionCalling || settings.value.geminiEnableGrounding)
  })

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    Object.assign(settings.value, newSettings)
    if (Array.isArray(newSettings.enabledFunctionTools)) {
      settings.value.enabledFunctionTools = cloneEnabledFunctionTools(newSettings.enabledFunctionTools)
    }
    isDirty.value = true
  }

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (key === 'enabledFunctionTools' && Array.isArray(value) && typeof value[0] === 'string') {
      settings.value[key] = cloneEnabledFunctionTools(value as string[]) as AppSettings[K]
    } else {
      settings.value[key] = value
    }
    isDirty.value = true
  }

  const setApiKey = (apiKey: string) => {
    updateSetting('apiKey', apiKey)
  }

  const setModelName = (modelName: string) => {
    updateSetting('modelName', modelName)
  }

  const setSystemPrompt = (systemPrompt: string) => {
    updateSetting('systemPrompt', systemPrompt)
  }

  const toggleStreaming = () => {
    updateSetting('streamingOutput', !settings.value.streamingOutput)
  }

  const toggleFunctionCalling = () => {
    updateSetting('geminiEnableFunctionCalling', !settings.value.geminiEnableFunctionCalling)
    if (settings.value.geminiEnableFunctionCalling && settings.value.geminiEnableGrounding) {
      updateSetting('geminiEnableGrounding', false)
    }
  }

  const toggleGoogleSearch = () => {
    updateSetting('geminiEnableGrounding', !settings.value.geminiEnableGrounding)
    if (settings.value.geminiEnableGrounding && settings.value.geminiEnableFunctionCalling) {
      updateSetting('geminiEnableFunctionCalling', false)
    }
  }

  const toggleProofreading = () => {
    updateSetting('enableProofreading', !settings.value.enableProofreading)
  }

  const toggleIncludeThoughts = () => {
    updateSetting('includeThoughts', !settings.value.includeThoughts)
    if (!settings.value.includeThoughts) {
      updateSetting('enableThoughtTranslation', false)
    }
  }

  const toggleAutoRetry = () => {
    updateSetting('enableAutoRetry', !settings.value.enableAutoRetry)
  }

  const setBackgroundImage = (file: File | null) => {
    if (!file) {
      updateSetting('backgroundImageBlob', null)
      updateSetting('backgroundImageDataUrl', null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        updateSetting('backgroundImageDataUrl', result)
        updateSetting('backgroundImageBlob', null)
      }
    }
    reader.readAsDataURL(file)
  }

  const setOverlayOpacity = (opacity: number) => {
    const clampedOpacity = clamp(opacity, 0, 0.95)
    updateSetting('overlayOpacity', clampedOpacity)
  }

  const setMessageOpacity = (opacity: number) => {
    const clampedOpacity = clamp(opacity, 0.1, 1.0)
    updateSetting('messageOpacity', clampedOpacity)
  }

  const setOverlayColor = (hex: string) => {
    // 正規化はUI側またはユーティリティで実行してから渡す前提
    updateSetting('overlayColor', hex)
  }

  const resetToDefaults = async () => {
    try {
      // 常に純粋なDEFAULT_SETTINGSを使用してリセット
      settings.value = createSettingsState()
      isDirty.value = true
    } catch (error) {
      logger.error('デフォルト値へのリセットに失敗しました。', { component: 'useSettingsStore' }, error)
      settings.value = createSettingsState()
    }
  }

  const saveSettings = async (skipProfileUpdate = false) => {
    try {
      isLoading.value = true
      const result = await saveSettingsToDB(settings.value)

      if (result.success) {
        // プロファイル更新はオプションにする（デフォルトは更新しない）
        if (!skipProfileUpdate) {
          try {
            const profilesStore = useSettingsProfilesStore()
            if (profilesStore.activeProfileId) {
              // プロファイル設定のみを更新（グローバル設定は含めない）
              const profileSettings = extractProfileSettings(settings.value)
              await profilesStore.updateProfile(profilesStore.activeProfileId, {
                settings: { ...profilesStore.activeProfile?.settings, ...profileSettings } as AppSettings,
              })
            }
          } catch (profileError) {
            logger.warn('アクティブプロファイルの更新に失敗しました', { component: 'useSettingsStore' }, profileError)
          }
        }
        lastSavedAt.value = Date.now()
        isDirty.value = false
      } else {
        logger.error('IndexedDBへの設定の保存に失敗しました:', { component: 'useSettingsStore' }, result.error)
        throw new Error(result.error || 'Failed to save settings')
      }
    } catch (error) {
      logger.error('IndexedDBへの設定の保存に失敗しました:', { component: 'useSettingsStore' }, error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const importSettings = (importedSettings: Partial<AppSettings>) => {
    settings.value = createSettingsState({ ...settings.value, ...importedSettings })
    isDirty.value = true
  }

  const exportSettings = (): AppSettings => {
    return {
      ...settings.value,
      enabledFunctionTools: cloneEnabledFunctionTools(settings.value.enabledFunctionTools),
    }
  }

  const loadSettings = async () => {
    try {
      isLoading.value = true
      const result = await loadSettingsFromDB()

      if (result.success && result.data) {
        const migrated = migrateLegacyThemeSettings(result.data)
        settings.value = createSettingsState(migrated)
        isDirty.value = false
        logger.info('IndexedDB から設定を読み込みました', { component: 'useSettingsStore' })
      } else {
        // IndexedDBに設定がない場合はデフォルト設定を使用
        settings.value = createSettingsState()
        isDirty.value = false
        logger.info('デフォルト設定を使用します', { component: 'useSettingsStore' })
      }
    } catch (error) {
      logger.error('IndexedDBからの設定の読み込みに失敗しました:', { component: 'useSettingsStore' }, error)
      settings.value = createSettingsState()
      isDirty.value = false
    } finally {
      isLoading.value = false
    }
  }

  const initialize = async () => {
    logger.info('設定ストアを初期化中...', { component: 'useSettingsStore' })
    await loadSettings()
    // CSS変数とアップロードフォントを適用（永続化されたデータURL対応）
    if (import.meta.client) {
      try {
        applyAppearanceVariables(settings.value)
        applyTheme(settings.value.themePreset)
        const uploaded = settings.value.uploadedFont
        if (uploaded && uploaded.dataUrl && uploaded.name) {
          const styleId = `uploaded-font-${uploaded.name}`
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = `
              @font-face { font-family: "${uploaded.name}"; src: url("${uploaded.dataUrl}"); font-display: swap; }
            `
            document.head.appendChild(style)
          }
        }
      } catch (error) {
        logger.warn('フォント適用時のエラー:', { component: 'useSettingsStore' }, error)
      }
    }
    logger.info('設定ストアの初期化が完了', { isValidConfiguration: isValidConfiguration.value, component: 'useSettingsStore' })
  }

  return {
    settings,
    isLoading,
    lastSavedAt,
    isDirty,

    apiConfig,
    apiSettings,
    geminiParameters,
    advancedSettings,
    thoughtTranslationSettings,
    retrySettings,
    proofreadingSettings,
    themeSettings,
    backgroundSettings,
    navigationSettings,
    avatarSettings,
    messageAppearanceSettings,

    isValidApiKey,
    isValidConfiguration,
    canUseAdvancedFeatures,

    updateSettings,
    updateSetting,

    setApiKey,
    setModelName,
    setSystemPrompt,
    toggleStreaming,
    toggleFunctionCalling,
    toggleGoogleSearch,
    toggleProofreading,
    toggleIncludeThoughts,
    toggleAutoRetry,

    setBackgroundImage,
    setOverlayOpacity,
    setMessageOpacity,
    setOverlayColor,

    resetToDefaults,
    saveSettings,
    loadSettings,
    importSettings,
    exportSettings,

    initialize,
  }
})

function migrateLegacyThemeSettings(data: AppSettings): AppSettings {
  const result: AppSettings & { darkMode?: boolean } = { ...data }

  if (!result.themePreset) {
    result.themePreset = DEFAULT_SETTINGS.themePreset
  }

  delete result.darkMode

  if (!['start', 'center', 'end'].includes(result.messageImageJustify as string)) {
    result.messageImageJustify = DEFAULT_SETTINGS.messageImageJustify
  }

  const theme = getThemePreset(result.themePreset)
  result.userBubbleColor = theme.userBubbleColor
  result.assistantBubbleColor = theme.assistantBubbleColor

  return result
}

function applyAppearanceVariables(settings: AppSettings) {
  if (!import.meta.client) return
  const root = document.documentElement
  if (settings.fontFamily) {
    root.style.setProperty('--message-font-family', settings.fontFamily)
  }
  root.style.setProperty('--message-font-size', `${settings.messageFontSize}px`)
  root.style.setProperty('--message-function-font-size', `${settings.functionCallFontSize}px`)
  root.style.setProperty('--message-thought-font-size', `${settings.thoughtFontSize}px`)
  root.style.setProperty('--message-bubble-radius', `${settings.messageBubbleRadius}px`)
  root.style.setProperty('--message-bubble-padding-x', `${settings.messageBubblePaddingX}px`)
  root.style.setProperty('--message-bubble-padding-y', `${settings.messageBubblePaddingY}px`)
  const widthPercent = settings.messageImageWidthPercent ?? 100
  root.style.setProperty('--message-image-width', `${widthPercent}%`)
  const { start, end } = getImageMargins(settings.messageImageJustify ?? 'start')
  root.style.setProperty('--message-image-margin-inline-start', start)
  root.style.setProperty('--message-image-margin-inline-end', end)
  root.style.setProperty('--message-user-bg', settings.userBubbleColor)
  root.style.setProperty('--message-assistant-bg', settings.assistantBubbleColor)
}
