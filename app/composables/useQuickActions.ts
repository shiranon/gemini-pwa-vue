import { Brain, BrainCircuit, FileText, FunctionSquare, Languages, RefreshCw, Search, Settings, SpellCheck, UserCircle } from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, markRaw } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'

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

  const quickActions = computed<QuickAction[]>(() => [
    {
      id: 'thinking-mode',
      label: '思考モード',
      icon: markRaw(Brain),
      enabled: settingsStore.settings.enableThinking,
      description: 'AIの思考モードを有効化',
      settingKey: 'enableThinking',
    },
    {
      id: 'thinking-process',
      label: '思考表示',
      icon: markRaw(BrainCircuit),
      enabled: settingsStore.settings.includeThoughts,
      description: 'AIの思考過程を表示',
      settingKey: 'includeThoughts',
    },
    {
      id: 'translation',
      label: '翻訳',
      icon: markRaw(Languages),
      enabled: settingsStore.settings.enableThoughtTranslation,
      description: '思考過程を翻訳',
      settingKey: 'enableThoughtTranslation',
    },
    {
      id: 'google-search',
      label: 'Google検索',
      icon: markRaw(Search),
      enabled: settingsStore.settings.geminiEnableGrounding,
      description: 'Google検索',
      settingKey: 'geminiEnableGrounding',
    },
    {
      id: 'autoRetry',
      label: '自動リトライ',
      icon: markRaw(RefreshCw),
      enabled: settingsStore.settings.enableAutoRetry,
      description: 'エラー時に自動再試行',
      settingKey: 'enableAutoRetry',
    },
    {
      id: 'proofreading',
      label: '校正',
      icon: markRaw(SpellCheck),
      enabled: settingsStore.settings.enableProofreading,
      description: 'テキストの校正機能',
      settingKey: 'enableProofreading',
    },
    {
      id: 'functionCalling',
      label: '関数呼出',
      icon: markRaw(FunctionSquare),
      enabled: settingsStore.settings.geminiEnableFunctionCalling,
      description: '関数機能全体',
      settingKey: 'geminiEnableFunctionCalling',
    },
    {
      id: 'summary',
      label: '要約',
      icon: markRaw(FileText),
      enabled: settingsStore.settings.enableSummary,
      description: 'チャット履歴を要約',
      settingKey: 'enableSummary',
    },
  ])

  const toggleAction = (actionId: string) => {
    const action = quickActions.value.find((a: QuickAction) => a.id === actionId)
    if (!action) return
    logger.info(`[Quick Actions] 設定が一時的に変更されました: ${actionId}`, { component: 'useQuickActions' })
    const newValue = !settingsStore.settings[action.settingKey as keyof typeof settingsStore.settings]
    settingsStore.updateSettings({ [action.settingKey]: newValue })
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
    {
      id: 'switch-profile',
      label: 'プロファイル',
      icon: markRaw(UserCircle),
      description: 'プロファイル切替',
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

  // プロファイル設定を更新する関数
  const updateProfileSetting = (key: string, value: unknown) => {
    if (profilesStore.activeProfile) {
      profilesStore.updateProfile(profilesStore.activeProfile.id, {
        settings: {
          ...profilesStore.activeProfile.settings,
          [key]: value,
        },
      })
    }
  }

  // アクティブプロファイルの設定を取得
  const getActiveProfileSettings = () => {
    return profilesStore.activeProfile?.settings
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
