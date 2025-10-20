import { Bot, Brain, BrainCircuit, FileText, FunctionSquare, Languages, MessagesSquare, RefreshCw, Search, Settings, SpellCheck, User, UserCircle } from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, markRaw, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfileData } from '~/types/settings'
import { logger } from '~/lib/logger'

// アイコンコンポーネントを事前にmarkRawで処理してメモリ効率を向上
const ICON_MAP = {
  'thinking-mode': markRaw(Brain),
  'thinking-process': markRaw(BrainCircuit),
  translation: markRaw(Languages),
  'google-search': markRaw(Search),
  autoRetry: markRaw(RefreshCw),
  proofreading: markRaw(SpellCheck),
  functionCalling: markRaw(FunctionSquare),
  summary: markRaw(FileText),
  dummyUserPrompt: markRaw(User),
  dummyModelPrompt: markRaw(Bot),
  avatarEnabled: markRaw(UserCircle),
  hideSystemPromptInChat: markRaw(MessagesSquare),
  summarize: markRaw(FileText),
  'toggle-functions': markRaw(Settings),
} as const

/**
 * クイックアクションの設定項目を表すインターフェース
 */
interface QuickAction {
  /** アクションの一意な識別子 */
  id: string
  /** 表示用のラベル */
  label: string
  /** アイコンコンポーネント（markRawで処理済み） */
  icon: ReturnType<typeof markRaw>
  /** 現在の有効/無効状態 */
  enabled: boolean
  /** アクションの説明文 */
  description: string
  /** 設定キー名 */
  settingKey: string
}

/**
 * 実行可能なアクションを表すインターフェース
 */
interface ExecutableAction {
  /** アクションの一意な識別子 */
  id: string
  /** 表示用のラベル */
  label: string
  /** アイコンコンポーネント */
  icon: Component
  /** アクションの説明文 */
  description: string
  /** 無効化フラグ */
  disabled?: boolean
}

/**
 * モーダルコンポーネントの参照を表すインターフェース
 */
interface ModalRef {
  /** モーダルを開く */
  open: () => void
  /** モーダルを閉じる */
  close: () => void
}

/**
 * クイックアクション機能を提供するComposable
 *
 * 設定の切り替えやアクションの実行、モーダル制御などの機能を統合的に管理します。
 * プロファイル固有の設定とグローバル設定を適切に処理し、
 * 一時的な設定変更と永続的な設定変更を区別して管理します。
 *
 * @returns クイックアクション関連の状態とメソッド
 */
export const useQuickActions = () => {
  const settingsStore = useSettingsStore()
  const profilesStore = useSettingsProfilesStore()

  // モーダル制御の状態管理
  const isOpen = ref(false)
  const functionToggleModalRef = ref<ModalRef>()
  const profileSwitchModalRef = ref<ModalRef>()

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
        icon: ICON_MAP['thinking-mode'],
        enabled: settings.enableThinking as boolean,
        description: 'AIの思考モードを有効化',
        settingKey: 'enableThinking',
      },
      {
        id: 'thinking-process',
        label: '思考表示',
        icon: ICON_MAP['thinking-process'],
        enabled: settings.includeThoughts as boolean,
        description: 'AIの思考過程を表示',
        settingKey: 'includeThoughts',
      },
      {
        id: 'translation',
        label: '翻訳',
        icon: ICON_MAP['translation'],
        enabled: settings.enableThoughtTranslation as boolean,
        description: '思考過程を翻訳',
        settingKey: 'enableThoughtTranslation',
      },
      {
        id: 'google-search',
        label: 'Google検索',
        icon: ICON_MAP['google-search'],
        enabled: settings.geminiEnableGrounding as boolean,
        description: 'Google検索',
        settingKey: 'geminiEnableGrounding',
      },
      {
        id: 'autoRetry',
        label: '自動リトライ',
        icon: ICON_MAP['autoRetry'],
        enabled: settings.enableAutoRetry as boolean,
        description: 'エラー時に自動再試行',
        settingKey: 'enableAutoRetry',
      },
      {
        id: 'proofreading',
        label: '校正',
        icon: ICON_MAP['proofreading'],
        enabled: settings.enableProofreading as boolean,
        description: 'テキストの校正機能',
        settingKey: 'enableProofreading',
      },
      {
        id: 'functionCalling',
        label: '関数呼出',
        icon: ICON_MAP['functionCalling'],
        enabled: settings.geminiEnableFunctionCalling as boolean,
        description: '関数機能全体',
        settingKey: 'geminiEnableFunctionCalling',
      },
      {
        id: 'summary',
        label: '要約',
        icon: ICON_MAP['summary'],
        enabled: settings.enableSummary as boolean,
        description: 'チャット履歴を要約',
        settingKey: 'enableSummary',
      },
      {
        id: 'dummyUserPrompt',
        label: 'ダミーユーザー',
        icon: ICON_MAP['dummyUserPrompt'],
        enabled: settings.enableDummyUserPrompt as boolean,
        description: 'ダミーユーザープロンプトを有効',
        settingKey: 'enableDummyUserPrompt',
      },
      {
        id: 'dummyModelPrompt',
        label: 'ダミーモデル',
        icon: ICON_MAP['dummyModelPrompt'],
        enabled: settings.enableDummyModelPrompt as boolean,
        description: 'ダミーモデルプロンプトを有効',
        settingKey: 'enableDummyModelPrompt',
      },
      {
        id: 'avatarEnabled',
        label: 'アバター',
        icon: ICON_MAP['avatarEnabled'],
        enabled: settings.avatarEnabled as boolean,
        description: 'アバター表示を有効',
        settingKey: 'avatarEnabled',
      },
      {
        id: 'hideSystemPromptInChat',
        label: 'システムプロンプト',
        icon: ICON_MAP['hideSystemPromptInChat'],
        enabled: !settings.hideSystemPromptInChat as boolean,
        description: 'システムプロンプトを表示',
        settingKey: 'hideSystemPromptInChat',
      },
    ]
  })

  /**
   * 指定されたアクションの設定を内部で切り替えます（排他制御用）
   *
   * @param actionId - 切り替えるアクションのID
   * @param value - 設定する値（true/false）
   */
  const toggleActionInternal = (actionId: string, value: boolean): void => {
    try {
      const action = quickActions.value.find((a: QuickAction) => a.id === actionId)
      if (!action) {
        logger.warn(`[Quick Actions] 内部切り替え: アクションが見つかりません: ${actionId}`, { component: 'useQuickActions' })
        return
      }

      const settings = currentSettings.value
      const currentValue = settings[action.settingKey as keyof typeof settings]

      // 既に同じ値の場合は何もしない
      if (currentValue === value) {
        return
      }

      // プロファイル固有の設定かグローバル設定かを判断して更新
      const profileSettings = profilesStore.activeProfile?.settings
      if (profileSettings && action.settingKey in profileSettings) {
        // プロファイル固有の設定を更新
        updateProfileSetting(action.settingKey as keyof SettingsProfileData, value as SettingsProfileData[keyof SettingsProfileData])
      } else {
        // グローバル設定を更新
        settingsStore.updateSettings({ [action.settingKey]: value })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`[Quick Actions] 内部切り替えエラー: ${actionId}`, {
        error: errorMessage,
        component: 'useQuickActions',
      })
    }
  }

  /**
   * 指定されたアクションの設定を切り替えます
   *
   * プロファイル固有の設定の場合は一時的な変更として処理し、
   * グローバル設定の場合は永続的な変更として処理します。
   * エラーが発生した場合はユーザーに適切なメッセージを表示します。
   *
   * @param actionId - 切り替えるアクションのID
   */
  const toggleAction = (actionId: string) => {
    try {
      logger.debug(`[Quick Actions] toggleAction開始: ${actionId}`, { component: 'useQuickActions' })
      const action = quickActions.value.find((a: QuickAction) => a.id === actionId)
      if (!action) {
        logger.warn(`[Quick Actions] アクションが見つかりません: ${actionId}`, { component: 'useQuickActions' })
        toast.error('設定の切り替えに失敗しました', {
          description: '指定されたアクションが見つかりません',
        })
        return
      }

      logger.debug(`[Quick Actions] 設定が一時的に変更されました: ${actionId}`, { component: 'useQuickActions' })
      const settings = currentSettings.value
      const currentValue = settings[action.settingKey as keyof typeof settings]
      const newValue = !currentValue
      logger.debug(`[Quick Actions] 現在の値: ${currentValue}, 新しい値: ${newValue}`, { component: 'useQuickActions' })

      // Google Search と Function Calling の排他制御
      if (actionId === 'google-search' && newValue) {
        // Google Search を有効にする場合、Function Calling を無効化
        const functionCallingAction = quickActions.value.find((a) => a.id === 'functionCalling')
        if (functionCallingAction && currentSettings.value.geminiEnableFunctionCalling) {
          logger.debug('[Quick Actions] Google Search有効化によりFunction Callingを無効化', { component: 'useQuickActions' })
          toggleActionInternal('functionCalling', false)
        }
      } else if (actionId === 'functionCalling' && newValue) {
        // Function Calling を有効にする場合、Google Search を無効化
        const googleSearchAction = quickActions.value.find((a) => a.id === 'google-search')
        if (googleSearchAction && currentSettings.value.geminiEnableGrounding) {
          logger.debug('[Quick Actions] Function Calling有効化によりGoogle Searchを無効化', { component: 'useQuickActions' })
          toggleActionInternal('google-search', false)
        }
      }

      // プロファイル固有の設定かグローバル設定かを判断して更新
      const profileSettings = profilesStore.activeProfile?.settings
      if (profileSettings && action.settingKey in profileSettings) {
        // プロファイル固有の設定を更新
        logger.debug(`[Quick Actions] プロファイル設定を更新: ${action.settingKey} = ${newValue}`, { component: 'useQuickActions' })
        updateProfileSetting(action.settingKey as keyof SettingsProfileData, newValue as SettingsProfileData[keyof SettingsProfileData])
      } else {
        // グローバル設定を更新
        logger.debug(`[Quick Actions] グローバル設定を更新: ${action.settingKey} = ${newValue}`, { component: 'useQuickActions' })
        settingsStore.updateSettings({ [action.settingKey]: newValue })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`[Quick Actions] toggleActionエラー: ${actionId}`, {
        error: errorMessage,
        component: 'useQuickActions',
      })
      toast.error('設定の切り替えに失敗しました', {
        description: '予期しないエラーが発生しました',
      })
    }
  }

  const executableActions = computed<ExecutableAction[]>(() => [
    {
      id: 'summarize',
      label: '要約作成',
      icon: ICON_MAP['summarize'],
      description: '会話を要約',
      disabled: false,
    },
    {
      id: 'toggle-functions',
      label: '関数設定',
      icon: ICON_MAP['toggle-functions'],
      description: '関数のオンオフ',
      disabled: false,
    },
  ])

  /**
   * 指定されたアクションを実行します
   *
   * アクションの種類に応じて、モーダルを開くか関数を実行するかを決定します。
   * エラーが発生した場合はユーザーに適切なメッセージを表示します。
   *
   * @param actionId - 実行するアクションのID
   * @returns アクションの実行結果（モーダルまたは関数の種類とペイロード）
   */
  const executeAction = async (actionId: string): Promise<{ type: 'modal' | 'function'; payload?: string }> => {
    try {
      logger.debug(`[Quick Actions] アクションを実行: ${actionId}`, { component: 'useQuickActions' })

      switch (actionId) {
        case 'summarize':
          return { type: 'function', payload: 'summarize' }
        case 'toggle-functions':
          return { type: 'modal', payload: 'function-toggle' }
        case 'switch-profile':
          return { type: 'modal', payload: 'profile-switch' }
        default:
          logger.warn(`[Quick Actions] 未知のアクション: ${actionId}`, { component: 'useQuickActions' })
          toast.warning('アクションが見つかりません', {
            description: '指定されたアクションは利用できません',
          })
          return { type: 'function' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`[Quick Actions] アクション実行エラー: ${actionId}`, {
        error: errorMessage,
        component: 'useQuickActions',
      })

      toast.error('アクションの実行に失敗しました', {
        description: '予期しないエラーが発生しました',
      })

      // エラーが発生した場合は安全なデフォルト値を返す
      return { type: 'function' }
    }
  }

  // モーダル制御関数
  const openModal = () => {
    try {
      isOpen.value = true
      logger.debug('[Quick Actions] モーダルを開きました', { component: 'useQuickActions' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[Quick Actions] モーダルを開く際にエラーが発生しました', {
        error: errorMessage,
        component: 'useQuickActions',
      })
      toast.error('モーダルを開けませんでした', {
        description: '予期しないエラーが発生しました',
      })
    }
  }

  const closeModal = () => {
    try {
      isOpen.value = false
      logger.debug('[Quick Actions] モーダルを閉じました', { component: 'useQuickActions' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[Quick Actions] モーダルを閉じる際にエラーが発生しました', {
        error: errorMessage,
        component: 'useQuickActions',
      })
      toast.error('モーダルを閉じられませんでした', {
        description: '予期しないエラーが発生しました',
      })
    }
  }

  // アクションクリックハンドラー（モーダル制御を含む）
  const handleActionClick = async (actionId: string, onSummarize?: () => void) => {
    const result = await executeAction(actionId)

    if (result.type === 'modal') {
      switch (result.payload) {
        case 'function-toggle':
          functionToggleModalRef.value?.open()
          break
        case 'profile-switch':
          profileSwitchModalRef.value?.open()
          break
      }
    } else if (result.type === 'function' && result.payload === 'summarize') {
      onSummarize?.()
      closeModal()
    }
  }

  // 設定トグルハンドラー
  const handleToggle = (actionId: string) => {
    toggleAction(actionId)
  }

  /**
   * プロファイル設定を更新します（一時的な変更のみ）
   *
   * この関数で行われる変更は一時的なものであり、プロファイルを切り替えると
   * 元の設定に戻ります。永続的な変更を行う場合は、プロファイル設定画面を使用してください。
   *
   * @param key - 更新する設定キー
   * @param value - 設定値
   */
  const updateProfileSetting = <K extends keyof SettingsProfileData>(key: K, value: SettingsProfileData[K]) => {
    if (profilesStore.activeProfile) {
      // プロファイルストアの一時的な設定を更新
      profilesStore.updateTemporarySetting(key, value)
    }
  }

  // アクティブプロファイルの設定を取得（一時的な設定を含む）
  const getActiveProfileSettings = () => {
    return profilesStore.activeProfileSettingsWithTemporary
  }

  /**
   * 一時的な設定変更があるかどうかを確認します
   */
  const hasTemporaryChanges = computed(() => {
    return Object.keys(profilesStore.temporarySettings || {}).length > 0
  })

  /**
   * 一時的な設定変更の詳細を取得します
   */
  const temporaryChangesSummary = computed(() => {
    const changes = profilesStore.temporarySettings || {}
    const changeCount = Object.keys(changes).length
    return {
      count: changeCount,
      hasChanges: changeCount > 0,
      changes: Object.entries(changes).map(([key, value]) => ({
        key,
        value,
        label: quickActions.value.find((action) => action.settingKey === key)?.label || key,
      })),
    }
  })

  /**
   * 一時的な設定変更をクリアします
   */
  const clearTemporaryChanges = () => {
    try {
      profilesStore.clearTemporarySettings()
      logger.debug('[Quick Actions] 一時的な設定をクリアしました', { component: 'useQuickActions' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[Quick Actions] 一時的な設定のクリアに失敗しました', {
        error: errorMessage,
        component: 'useQuickActions',
      })
      toast.error('一時的な設定のクリアに失敗しました', {
        description: '予期しないエラーが発生しました',
      })
    }
  }

  /**
   * コンポーネントのアンマウント時にリソースをクリーンアップします
   */
  const cleanup = () => {
    try {
      // モーダルrefsをクリア
      functionToggleModalRef.value = undefined
      profileSwitchModalRef.value = undefined

      // モーダルを閉じる
      isOpen.value = false

      logger.debug('[Quick Actions] リソースをクリーンアップしました', { component: 'useQuickActions' })
    } catch (error) {
      logger.warn('[Quick Actions] クリーンアップ中にエラーが発生しました', {
        component: 'useQuickActions',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // コンポーネントのアンマウント時にクリーンアップを実行
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 既存の機能
    quickActions,
    toggleAction,
    executableActions,
    executeAction,
    updateProfileSetting,
    getActiveProfileSettings,

    // 新しく追加したモーダル制御機能
    isOpen,
    functionToggleModalRef,
    profileSwitchModalRef,
    openModal,
    closeModal,
    handleActionClick,
    handleToggle,

    // 一時的な設定管理機能
    hasTemporaryChanges,
    temporaryChangesSummary,
    clearTemporaryChanges,
  }
}
