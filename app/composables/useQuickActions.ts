import { Bot, Brain, BrainCircuit, FileText, FunctionSquare, Languages, MessagesSquare, RefreshCw, Search, Settings, SpellCheck, User, UserCircle } from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, markRaw } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfileData } from '~/types/settings'
import { logger } from '~/utils/logger'

interface QuickAction {
  id: string
  label: string
  icon: ReturnType<typeof markRaw>
  enabled: boolean
  description: string
  settingKey: string
}

interface ExecutableAction {
  id: string
  label: string
  icon: Component
  description: string
  disabled?: boolean
}

export const useQuickActions = () => {
  const settingsStore = useSettingsStore()
  const profilesStore = useSettingsProfilesStore()

  // プロファイル設定とグローバル設定を統合した設定を取得
  const currentSettings = computed(() => {
    const activeProfile = profilesStore.activeProfile
    if (!activeProfile) {
      return settingsStore.settings
    }
    // プロファイル固有の設定（一時的な変更を含む）とグローバル設定をマージ
    return {
      ...settingsStore.settings,
      ...profilesStore.activeProfileSettingsWithTemporary,
    }
  })

  const quickActions = computed<QuickAction[]>(() => {
    const settings = currentSettings.value
    return [
      {
        id: 'thinking-mode',
        label: '思考モード',
        icon: markRaw(Brain),
        enabled: settings.enableThinking as boolean,
        description: 'AIの思考モードを有効化',
        settingKey: 'enableThinking',
      },
      {
        id: 'thinking-process',
        label: '思考表示',
        icon: markRaw(BrainCircuit),
        enabled: settings.includeThoughts as boolean,
        description: 'AIの思考過程を表示',
        settingKey: 'includeThoughts',
      },
      {
        id: 'translation',
        label: '翻訳',
        icon: markRaw(Languages),
        enabled: settings.enableThoughtTranslation as boolean,
        description: '思考過程を翻訳',
        settingKey: 'enableThoughtTranslation',
      },
      {
        id: 'google-search',
        label: 'Google検索',
        icon: markRaw(Search),
        enabled: settings.geminiEnableGrounding as boolean,
        description: 'Google検索',
        settingKey: 'geminiEnableGrounding',
      },
      {
        id: 'autoRetry',
        label: '自動リトライ',
        icon: markRaw(RefreshCw),
        enabled: settings.enableAutoRetry as boolean,
        description: 'エラー時に自動再試行',
        settingKey: 'enableAutoRetry',
      },
      {
        id: 'proofreading',
        label: '校正',
        icon: markRaw(SpellCheck),
        enabled: settings.enableProofreading as boolean,
        description: 'テキストの校正機能',
        settingKey: 'enableProofreading',
      },
      {
        id: 'functionCalling',
        label: '関数呼出',
        icon: markRaw(FunctionSquare),
        enabled: settings.geminiEnableFunctionCalling as boolean,
        description: '関数機能全体',
        settingKey: 'geminiEnableFunctionCalling',
      },
      {
        id: 'summary',
        label: '要約',
        icon: markRaw(FileText),
        enabled: settings.enableSummary as boolean,
        description: 'チャット履歴を要約',
        settingKey: 'enableSummary',
      },
      {
        id: 'dummyUserPrompt',
        label: 'ダミーユーザー',
        icon: markRaw(User),
        enabled: settings.enableDummyUserPrompt as boolean,
        description: 'ダミーユーザープロンプトを有効',
        settingKey: 'enableDummyUserPrompt',
      },
      {
        id: 'dummyModelPrompt',
        label: 'ダミーモデル',
        icon: markRaw(Bot),
        enabled: settings.enableDummyModelPrompt as boolean,
        description: 'ダミーモデルプロンプトを有効',
        settingKey: 'enableDummyModelPrompt',
      },
      {
        id: 'avatarEnabled',
        label: 'アバター',
        icon: markRaw(UserCircle),
        enabled: settings.avatarEnabled as boolean,
        description: 'アバター表示を有効',
        settingKey: 'avatarEnabled',
      },
      {
        id: 'hideSystemPromptInChat',
        label: 'システムプロンプト',
        icon: markRaw(MessagesSquare),
        enabled: !settings.hideSystemPromptInChat as boolean,
        description: 'システムプロンプトを表示',
        settingKey: 'hideSystemPromptInChat',
      },
    ]
  })

  const toggleAction = (actionId: string) => {
    logger.info(`[Quick Actions] toggleAction開始: ${actionId}`, { component: 'useQuickActions' })
    const action = quickActions.value.find((a: QuickAction) => a.id === actionId)
    if (!action) return
    logger.info(`[Quick Actions] 設定が一時的に変更されました: ${actionId}`, { component: 'useQuickActions' })
    const settings = currentSettings.value
    const currentValue = settings[action.settingKey as keyof typeof settings]
    const newValue = !currentValue
    logger.info(`[Quick Actions] 現在の値: ${currentValue}, 新しい値: ${newValue}`, { component: 'useQuickActions' })

    // プロファイル固有の設定かグローバル設定かを判断して更新
    const profileSettings = profilesStore.activeProfile?.settings
    if (profileSettings && action.settingKey in profileSettings) {
      // プロファイル固有の設定を更新
      logger.info(`[Quick Actions] プロファイル設定を更新: ${action.settingKey} = ${newValue}`, { component: 'useQuickActions' })
      updateProfileSetting(action.settingKey, newValue)
    } else {
      // グローバル設定を更新
      logger.info(`[Quick Actions] グローバル設定を更新: ${action.settingKey} = ${newValue}`, { component: 'useQuickActions' })
      settingsStore.updateSettings({ [action.settingKey]: newValue })
    }
  }

  const executableActions = computed<ExecutableAction[]>(() => [
    {
      id: 'summarize',
      label: '要約作成',
      icon: markRaw(FileText),
      description: '会話を要約',
      disabled: false,
    },
    {
      id: 'toggle-functions',
      label: '関数設定',
      icon: markRaw(Settings),
      description: '関数のオンオフ',
      disabled: false,
    },
  ])

  const executeAction = async (actionId: string): Promise<{ type: 'modal' | 'function'; payload?: string }> => {
    logger.info(`[Quick Actions] アクションを実行: ${actionId}`, { component: 'useQuickActions' })

    switch (actionId) {
      case 'summarize':
        return { type: 'function', payload: 'summarize' }
      case 'toggle-functions':
        return { type: 'modal', payload: 'function-toggle' }
      case 'switch-profile':
        return { type: 'modal', payload: 'profile-switch' }
      default:
        logger.warn(`[Quick Actions] 未知のアクション: ${actionId}`, { component: 'useQuickActions' })
        return { type: 'function' }
    }
  }

  // プロファイル設定を更新する関数（一時的な変更のみ）
  const updateProfileSetting = (key: string, value: unknown) => {
    if (profilesStore.activeProfile) {
      // プロファイルストアの一時的な設定を更新
      profilesStore.updateTemporarySetting(key as keyof SettingsProfileData, value as SettingsProfileData[keyof SettingsProfileData])
    }
  }

  // アクティブプロファイルの設定を取得（一時的な設定を含む）
  const getActiveProfileSettings = () => {
    return profilesStore.activeProfileSettingsWithTemporary
  }

  return {
    quickActions,
    toggleAction,
    executableActions,
    executeAction,
    updateProfileSetting,
    getActiveProfileSettings,
  }
}
