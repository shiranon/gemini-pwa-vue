import { computed, markRaw } from 'vue'
import { Brain, Languages, RefreshCw, SpellCheck, FunctionSquare, FileText } from 'lucide-vue-next'
import { useSettingsStore } from '~/stores/settings'

interface QuickAction {
  id: string
  label: string
  icon: ReturnType<typeof markRaw>
  enabled: boolean
  description: string
  settingKey: string
}

export const useQuickActions = () => {
  const settingsStore = useSettingsStore()

  const quickActions = computed<QuickAction[]>(() => [
    {
      id: 'summary',
      label: '要約',
      icon: markRaw(FileText),
      enabled: settingsStore.settings.enableSummary,
      description: 'チャット履歴を要約',
      settingKey: 'enableSummary',
    },
    {
      id: 'thinking',
      label: '思考過程',
      icon: markRaw(Brain),
      enabled: settingsStore.settings.enableThinking,
      description: 'AIの思考過程を表示',
      settingKey: 'enableThinking',
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
  ])

  const toggleAction = (actionId: string) => {
    const action = quickActions.value.find((a: QuickAction) => a.id === actionId)
    if (!action) return

    const newValue = !settingsStore.settings[action.settingKey as keyof typeof settingsStore.settings]
    settingsStore.updateSettings({ [action.settingKey]: newValue })
  }

  return {
    quickActions,
    toggleAction,
  }
}
