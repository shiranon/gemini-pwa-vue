/**
 * OpenAI API ストア
 * API呼び出し、ストリーミング、エラー処理の状態管理を一元化
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useOpenAiAgentsApi, type OpenAiApiSettings } from '~/composables/useOpenAiAgentsApi'
import { proofreadText } from '~/composables/useProofreader'
import { translateThoughts } from '~/composables/useTranslator'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { ApiError, AssistantMessage, AttachedFile, ChatMessage } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'

export const useOpenAiStore = defineStore('openai', () => {
  // API実行状態
  const isSending = ref(false)
  const isStreaming = ref(false)
  const streamingMessageId = ref<string | null>(null)
  const streamingContent = ref('')

  // エラー状態
  const currentError = ref<string | null>(null)
  const lastErrorTime = ref<number | null>(null)

  // API統計
  const totalApiCalls = ref(0)
  const successfulCalls = ref(0)
  const failedCalls = ref(0)

  const isIdle = computed(() => !isSending.value && !isStreaming.value)
  const hasError = computed(() => currentError.value !== null)
  const successRate = computed(() => {
    return totalApiCalls.value > 0 ? (successfulCalls.value / totalApiCalls.value) * 100 : 0
  })

  const openaiApi = useOpenAiAgentsApi()

  /**
   * チャットメッセージをOpenAI API用の形式に変換する
   */
  const prepareMessagesForApi = (messages: ChatMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> => {
    return messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }))
  }

  /**
   * API設定から生成設定を構築する
   */
  const buildGenerationConfig = (settings: OpenAiApiSettings): Record<string, unknown> => {
    const config: Record<string, unknown> = {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
    }

    // 思考プロセス設定を追加（enableThinkingが有効な場合のみ）
    if (settings.enableThinking) {
      config.thinkingConfig = {
        includeThoughts: settings.includeThoughts ?? false,
        thinkingBudget: settings.thinkingBudget ?? -1,
      }
    }

    return config
  }

  const settingsStore = useSettingsStore()
  const profilesStore = useSettingsProfilesStore()

  // 一時的な設定を含むプロファイル設定を取得
  const getActiveProfileSettings = () => {
    return profilesStore.activeProfileSettingsWithTemporary
  }

  type SendChatMessageOptions = {
    content?: string
    attachments?: AttachedFile[]
    skipAddingUserMessage?: boolean
    onError?: (error: ApiError | null) => void
    onRetryScheduled?: (info: { attempt: number; delayMs: number }) => void
    onRetryStarted?: (info: { attempt: number }) => void
  }

  type ChatCallbackHooks = {
    onError?: (error: ApiError | null) => void
    onRetryScheduled?: (info: { attempt: number; delayMs: number }) => void
    onRetryStarted?: (info: { attempt: number }) => void
  }

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms)
    })

  /**
   * エラーをApiError形式に変換（ベストプラクティス: より詳細なエラー分類）
   */
  const toApiError = (error: unknown): ApiError => {
    if (error && typeof error === 'object' && 'apiError' in error && (error as { apiError?: ApiError }).apiError) {
      return (error as { apiError: ApiError }).apiError
    }

    let message = '不明なエラーが発生しました'
    let code = 'UNKNOWN'
    let details: string | object | undefined

    if (error instanceof Error) {
      message = error.message || message
      if ('code' in error && typeof (error as { code?: string }).code === 'string') {
        code = (error as { code: string }).code
      }
      if ('cause' in error && (error as { cause?: unknown }).cause) {
        details = (error as { cause?: unknown }).cause as string | object
      }
    } else if (typeof error === 'string') {
      message = error
    } else if (typeof error === 'object' && error) {
      if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
        message = (error as { message: string }).message
      }
      if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
        code = (error as { code: string }).code
      }
      if ('status' in error && typeof (error as { status?: unknown }).status === 'number') {
        code = `HTTP_${(error as { status: number }).status}`
      }
      details = error as object
    }

    // ベストプラクティス: より詳細なエラー分類とリトライ判定
    const lowerMessage = message.toLowerCase()
    const nonRetriableKeywords = [
      'invalid argument',
      'invalid api key',
      'permission',
      'unauthorized',
      'format',
      'quota',
      'billing',
      'subscription',
      'model not found',
      'api key not found',
      'authentication failed',
    ]
    const nonRetriablePatterns = [/api\s*キーが不正/, /不正な\s*api\s*キー/, /認証に失敗/, /利用制限/, /課金エラー/, /モデルが見つかりません/]

    // リトライ可能なエラー
    const retriableKeywords = ['rate limit', 'timeout', 'network', 'connection', 'server error']
    const retriablePatterns = [/レート制限/, /タイムアウト/, /ネットワークエラー/, /サーバーエラー/]

    let retirable = true // デフォルトはリトライ可能

    // 明らかにリトライ不可能なエラー
    if (nonRetriableKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      retirable = false
    }
    if (nonRetriablePatterns.some((pattern) => pattern.test(lowerMessage))) {
      retirable = false
    }

    // 明らかにリトライ可能なエラー
    if (retriableKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      retirable = true
    }
    if (retriablePatterns.some((pattern) => pattern.test(lowerMessage))) {
      retirable = true
    }

    const apiError: ApiError = {
      code,
      message,
      retirable,
    }

    if (details) {
      apiError.details = details
    }

    return apiError
  }

  /**
   * ストリーミングレスポンスを処理する（ベストプラクティス: メモリ効率とエラーハンドリングの改善）
   */
  const handleStreamingResponse = async (
    messagesForApi: Array<{ role: string; parts: Array<{ text: string }> }>,
    generationConfig: Record<string, unknown>,
    systemInstruction: { role: string; parts: Array<{ text: string }> } | null,
    settings: OpenAiApiSettings,
    callbacks: {
      onMessageStart: (message: ChatMessage) => number
      onMessageUpdate: (index: number, updates: Partial<ChatMessage>) => void
    }
  ) => {
    let messageIndex: number = -1
    let assistantMessage: ChatMessage | null = null
    let completed = false

    // ストリーミング状態を開始
    isStreaming.value = true
    streamingContent.value = ''
    streamingMessageId.value = null

    // メモリ効率の改善: 必要最小限のデータのみ保持
    let accumulatedThoughts: string | undefined
    let translated: string | undefined
    let accumulatedFunctionCalls: FunctionCall[] = []
    let accumulatedFunctionResults: FunctionCallResult[] = []

    try {
      for await (const chunk of openaiApi.generateContentStream(messagesForApi, generationConfig, systemInstruction, settings)) {
        if (chunk.type === 'chunk') {
          // 初回チャンクでメッセージを作成
          if (messageIndex === -1) {
            assistantMessage = {
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            }
            // ストリーミング開始時にダミーModel（プレフィル）を先頭に適用（必要な場合）
            if (settings.prependDummyModelToResponse && settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
              assistantMessage.content = `${settings.dummyModelPrompt}\n`
              streamingContent.value = assistantMessage.content
            }
            const chatStore = useChatStore()
            const reuseIndex = callbacks.onMessageStart(assistantMessage)

            if (reuseIndex >= 0) {
              const existingMessage = chatStore.visibleMessages[reuseIndex] as AssistantMessage | undefined
              const baseTimestamp = existingMessage?.createdAt ?? Date.now()
              assistantMessage.timestamp = baseTimestamp
              messageIndex = reuseIndex
              streamingMessageId.value = baseTimestamp.toString()
              streamingContent.value = assistantMessage.content

              callbacks.onMessageUpdate(messageIndex, {
                content: assistantMessage.content,
                error: false,
                thoughts: existingMessage?.thoughts ? '' : undefined,
                translatedThoughts: existingMessage?.translatedThoughts ? '' : undefined,
                functionCalls: [],
                functionResults: [],
              })
            } else {
              // ChatInterface.vueが-1を返すので、こちらでメッセージを直接追加
              chatStore.addMessage(assistantMessage)
              messageIndex = chatStore.currentMessages.length - 1
              streamingMessageId.value = assistantMessage.timestamp?.toString() || null
              logger.info('[OpenAIストア] アシスタントメッセージを作成（インデックス）:', { component: 'useOpenAiStore' }, messageIndex)
            }
          }

          // コンテンツの更新
          if (chunk.contentText && assistantMessage) {
            assistantMessage.content += chunk.contentText
            streamingContent.value = assistantMessage.content
          }

          // 思考プロセスが含まれている場合は蓄積
          if (settings.includeThoughts && 'thoughts' in chunk && typeof chunk.thoughts === 'string') {
            accumulatedThoughts = chunk.thoughts
          }

          // Function Call の蓄積（参照を避けてコピー）
          if (chunk.functionCalls) {
            accumulatedFunctionCalls = [...chunk.functionCalls]
          }

          // Function Call 結果の蓄積（参照を避けてコピー）
          if ('functionResults' in chunk.data && chunk.data.functionResults) {
            accumulatedFunctionResults = [...(chunk.data.functionResults as FunctionCallResult[])]
          }

          if (messageIndex !== -1 && assistantMessage) {
            callbacks.onMessageUpdate(messageIndex, {
              content: assistantMessage.content,
              ...(accumulatedThoughts && { thoughts: accumulatedThoughts }),
              ...(accumulatedFunctionCalls.length > 0 && { functionCalls: [...accumulatedFunctionCalls] }),
              ...(accumulatedFunctionResults.length > 0 && { functionResults: [...accumulatedFunctionResults] }),
            })
          }
        }
      }

      // ストリーミング完了時に最終的な思考プロセスを設定し、必要なら翻訳
      if (settings.includeThoughts && accumulatedThoughts && assistantMessage) {
        assistantMessage.thoughts = accumulatedThoughts
        if (settings.enableThoughtTranslation) {
          try {
            translated = await translateThoughts({
              provider: settings.thoughtTranslationProvider === 'deepl' ? 'deepl' : 'gemini',
              text: accumulatedThoughts,
              settings: {
                apiKey: settings.apiKey,
                thoughtTranslationModel: settings.thoughtTranslationModel || 'gemini-2.0-flash-lite',
                deeplApiKey: settings.deeplApiKey || '',
              },
            })
            if (translated) assistantMessage.translatedThoughts = translated
          } catch (error) {
            logger.warn('思考プロセスの翻訳に失敗しました:', { component: 'useOpenAiStore' }, error)
          }
        }
      }

      // 校正（任意）: 応答コンテンツを校正
      if (assistantMessage && settings.enableProofreading) {
        try {
          const proof = await proofreadText(assistantMessage.content, {
            apiKey: settings.apiKey,
            model: settings.proofreadingModelName || settings.model,
            systemInstruction: settings.proofreadingSystemInstruction || undefined,
          })
          if (proof && proof !== assistantMessage.content) {
            assistantMessage.content = proof
            ;(assistantMessage as { isProofread?: boolean }).isProofread = true
            // 校正後の内容をUIに反映
            if (messageIndex !== -1) {
              callbacks.onMessageUpdate(messageIndex, {
                content: proof,
                ...{ isProofread: true },
              } as Partial<ChatMessage>)
            }
          }
        } catch (error) {
          logger.warn('校正に失敗しました:', { component: 'useOpenAiStore' }, error)
        }
      }

      successfulCalls.value++
      completed = true
    } catch (error) {
      // ベストプラクティス: より詳細なエラーログ
      logger.error('[OpenAIストア] ストリーミング処理中にエラーが発生:', { component: 'useOpenAiStore' }, error)
      if (messageIndex !== -1 && assistantMessage) {
        callbacks.onMessageUpdate(messageIndex, {
          content: assistantMessage.content,
          error: true,
        })
      }

      throw error
    } finally {
      // ストリーミング状態を終了
      isStreaming.value = false
      streamingContent.value = ''
      streamingMessageId.value = null

      // ストリーミング完了時の最終アップデートを送信
      if (completed && messageIndex !== -1 && assistantMessage) {
        callbacks.onMessageUpdate(messageIndex, {
          content: assistantMessage.content,
          ...(accumulatedThoughts && { thoughts: accumulatedThoughts }),
          ...(translated && { translatedThoughts: translated }),
          ...(accumulatedFunctionCalls.length > 0 && { functionCalls: [...accumulatedFunctionCalls] }),
          ...(accumulatedFunctionResults.length > 0 && { functionResults: [...accumulatedFunctionResults] }),
          isStreamingComplete: true,
        })
      }
    }
  }

  /**
   * 非ストリーミングレスポンスを処理する
   */
  const handleNonStreamingResponse = async (
    messagesForApi: Array<{ role: string; parts: Array<{ text: string }> }>,
    generationConfig: Record<string, unknown>,
    systemInstruction: { role: string; parts: Array<{ text: string }> } | null,
    settings: OpenAiApiSettings,
    callbacks: {
      onMessageAdd: (message: ChatMessage) => void
    }
  ) => {
    const response = await openaiApi.generateContent(messagesForApi, generationConfig, systemInstruction, settings)

    if (response.text) {
      // 思考プロセスを抽出
      const thoughts = response.thoughts

      logger.info('[OpenAIストア] 関数呼び出しを含む応答:', {
        functionCalls: response.functionCalls,
        functionResults: response.functionResults,
      })

      let translated: string | undefined
      if (settings.includeThoughts && settings.enableThoughtTranslation && thoughts) {
        try {
          translated = await translateThoughts({
            provider: settings.thoughtTranslationProvider === 'deepl' ? 'deepl' : 'gemini',
            text: thoughts,
            settings: {
              apiKey: settings.apiKey,
              thoughtTranslationModel: settings.thoughtTranslationModel || 'gemini-2.0-flash-lite',
              deeplApiKey: settings.deeplApiKey || '',
            },
          })
        } catch (error) {
          logger.warn('思考プロセスの翻訳に失敗しました:', { component: 'useOpenAiStore' }, error)
        }
      }

      // 校正（任意）: 非ストリーミングでも応答生成後に校正
      let finalContent = response.text
      let isProofread = false
      if (settings.enableProofreading) {
        try {
          const proof = await proofreadText(finalContent, {
            apiKey: settings.apiKey,
            model: settings.proofreadingModelName || settings.model,
            systemInstruction: settings.proofreadingSystemInstruction || undefined,
          })
          if (proof && proof !== finalContent) {
            finalContent = proof
            isProofread = true
          }
        } catch (error) {
          logger.warn('校正に失敗しました:', { component: 'useOpenAiStore' }, error)
        }
      }

      // 保存前の連結処理（非ストリーミング時）
      if (settings.prependDummyModelToResponse && settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        finalContent = `${settings.dummyModelPrompt}\n${finalContent}`
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: finalContent,
        timestamp: Date.now(),
        ...(settings.includeThoughts &&
          thoughts && {
            thoughts,
          }),
        ...(isProofread && { isProofread: true }),
        ...(translated && { translatedThoughts: translated }),
        ...(response.functionCalls && {
          functionCalls: response.functionCalls,
        }),
        ...(response.functionResults && {
          functionResults: response.functionResults,
        }),
      }

      // デバッグ: 非ストリーミング - アシスタントメッセージを確認
      logger.info('[OpenAIストア] アシスタントメッセージを作成:', {
        component: 'useOpenAiStore',
        contentLength: assistantMessage.content.length,
        hasFunctionCalls: !!assistantMessage.functionCalls,
        functionCallsCount: assistantMessage.functionCalls?.length || 0,
        hasFunctionResults: !!assistantMessage.functionResults,
        functionResultsCount: assistantMessage.functionResults?.length || 0,
        functionCalls: assistantMessage.functionCalls?.map((fc: FunctionCall) => ({ name: fc.name, hasArgs: Object.keys(fc.args).length > 0 })),
        functionResults: assistantMessage.functionResults?.map((fr: FunctionCallResult) => ({ name: fr.name, hasResult: !!fr.result, hasError: !!fr.error })),
      })

      callbacks.onMessageAdd(assistantMessage)
      successfulCalls.value++
    } else {
      throw new Error('API応答の形式が不正です')
    }
  }

  /**
   * OpenAIメッセージを送信する統合処理
   */
  const executeOpenAiRequest = async (
    messages: ChatMessage[],
    settings: OpenAiApiSettings,
    callbacks: {
      onAssistantMessageStart: (message: ChatMessage) => number
      onAssistantMessageAdd: (message: ChatMessage) => void
      onMessageUpdate: (index: number, updates: Partial<ChatMessage>) => void
      onError?: (error: ApiError | null) => void
      onRetryScheduled?: (info: { attempt: number; delayMs: number }) => void
      onRetryStarted?: (info: { attempt: number }) => void
    }
  ) => {
    if (isSending.value || isStreaming.value) {
      throw new Error('別のメッセージが処理中です')
    }

    logger.info('[自動リトライ] リクエスト送信を開始します', {
      messageCount: messages.length,
      streaming: settings.streamingOutput,
    })

    try {
      isSending.value = true
      clearError()
      callbacks.onError?.(null)

      const messagesForApi = prepareMessagesForApi(messages)

      const generationConfig = buildGenerationConfig(settings)
      const systemInstruction = settings.systemPrompt
        ? {
            role: 'user',
            parts: [{ text: settings.systemPrompt }],
          }
        : null
      const retrySettings = settingsStore.retrySettings
      const maxRetries = Math.max(0, retrySettings.maxRetries)
      let attempt = 0

      while (true) {
        attempt++
        totalApiCalls.value++

        logger.info('[自動リトライ] リクエスト試行を開始します', { attempt })

        if (attempt > 1) {
          callbacks.onRetryStarted?.({ attempt })
          logger.info('[自動リトライ] 再試行を実行中です', { attempt })
        }

        try {
          if (settings.streamingOutput) {
            await handleStreamingResponse(messagesForApi, generationConfig, systemInstruction, settings, {
              onMessageStart: callbacks.onAssistantMessageStart,
              onMessageUpdate: callbacks.onMessageUpdate,
            })
          } else {
            await handleNonStreamingResponse(messagesForApi, generationConfig, systemInstruction, settings, {
              onMessageAdd: callbacks.onAssistantMessageAdd,
            })
          }

          callbacks.onError?.(null)
          if (attempt > 1) {
            logger.info('[自動リトライ] 再試行に成功しました', { attempt })
          } else {
            logger.info('[自動リトライ] 初回の試行で成功しました', { component: 'useOpenAiStore' })
          }
          break
        } catch (error) {
          const apiError = toApiError(error)
          failedCalls.value++
          setError(apiError.message)

          const retriesUsed = attempt - 1
          const shouldRetry = retrySettings.enableAutoRetry && apiError.retirable !== false && retriesUsed < maxRetries

          const retryNumber = retriesUsed + 1
          // ベストプラクティス: より柔軟なリトライ遅延計算
          const delayMs = shouldRetry
            ? retrySettings.useFixedRetryDelay
              ? Math.max(1, retrySettings.fixedRetryDelaySeconds) * 1000
              : Math.min(
                  Math.pow(2, retryNumber - 1) * 1000 + Math.random() * 1000, // ジッター追加
                  Math.max(1, retrySettings.maxBackoffDelaySeconds) * 1000
                )
            : undefined

          callbacks.onError?.({
            ...apiError,
            attempt: shouldRetry ? retryNumber : attempt,
            maxRetries,
            nextRetryDelayMs: delayMs,
            retrying: shouldRetry,
          })

          if (shouldRetry && delayMs) {
            callbacks.onRetryScheduled?.({ attempt: retryNumber, delayMs })
            logger.info('[自動リトライ] 再試行を予約しました', {
              nextAttempt: retryNumber + 1,
              delayMs: Math.round(delayMs),
              errorCode: apiError.code,
              retirable: apiError.retirable,
            })
          }

          if (!shouldRetry || !delayMs) {
            logger.info('[自動リトライ] 再試行を断念します', {
              finalAttempt: attempt,
              errorCode: apiError.code,
              retirable: apiError.retirable,
              reason: !retrySettings.enableAutoRetry ? 'auto-retry disabled' : apiError.retirable === false ? 'non-retriable error' : retriesUsed >= maxRetries ? 'max retries reached' : 'unknown',
            })
            const propagated = Object.assign(new Error(apiError.message), {
              apiError,
              alreadyNotified: true,
            })
            throw propagated
          }

          await sleep(delayMs)
        }
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'apiError' in error && !(error as { alreadyNotified?: boolean }).alreadyNotified) {
        callbacks.onError?.((error as { apiError: ApiError }).apiError)
      }
      throw error
    } finally {
      isSending.value = false
    }
  }

  const createChatCallbacks = (hooks?: ChatCallbackHooks) => {
    const chatStore = useChatStore()

    return {
      onAssistantMessageStart: (_message: ChatMessage) => {
        chatStore.startStreaming()

        const lastIndex = chatStore.visibleMessages.length - 1
        if (lastIndex >= 0) {
          const lastMessage = chatStore.visibleMessages[lastIndex] as AssistantMessage | undefined
          if (lastMessage?.role === 'assistant' && lastMessage.error) {
            return lastIndex
          }
        }

        return -1
      },
      onAssistantMessageAdd: (message: ChatMessage) => {
        chatStore.addMessage({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp || Date.now(),
          thoughts: message.thoughts,
          translatedThoughts: message.translatedThoughts,
          error: message.error,
          functionCalls: message.functionCalls,
          functionResults: message.functionResults,
        })
        chatStore.completeStreaming({
          functionCalls: message.functionCalls,
          functionResults: message.functionResults,
        })
      },
      onMessageUpdate: (index: number, updates: Partial<ChatMessage>) => {
        chatStore.updateMessage(index, {
          content: updates.content,
          error: updates.error,
          thoughts: updates.thoughts,
          translatedThoughts: updates.translatedThoughts,
          functionCalls: updates.functionCalls,
          functionResults: updates.functionResults,
        })

        if (updates.isStreamingComplete) {
          chatStore.completeStreaming({
            functionCalls: updates.functionCalls,
            functionResults: updates.functionResults,
          })
        }
      },
      onError: (error: ApiError | null) => {
        if (error) {
          chatStore.setError(error)
        } else {
          chatStore.clearError()
        }

        hooks?.onError?.(error)
      },
      onRetryScheduled: hooks?.onRetryScheduled,
      onRetryStarted: hooks?.onRetryStarted,
    }
  }

  const sendChatMessage = async (options: SendChatMessageOptions = {}): Promise<boolean> => {
    const chatStore = useChatStore()

    if (options.attachments && options.attachments.length > 0) {
      chatStore.clearInput()
      options.attachments.forEach((file) => {
        chatStore.attachFile(file)
      })
    }

    if (options.content !== undefined) {
      chatStore.setInputText(options.content.trim())
    }

    // プロファイル設定とグローバル設定を統合
    const activeProfile = profilesStore.activeProfile
    const profileSettings = getActiveProfileSettings()

    // デバッグ: グローバル設定の確認
    logger.info('[OpenAIストア] グローバル設定確認:', {
      component: 'useOpenAiStore',
      openaiApiKey: settingsStore.settings.openaiApiKey ? '設定済み' : '未設定',
      openaiApiKeyLength: settingsStore.settings.openaiApiKey?.length || 0,
      apiKey: settingsStore.settings.apiKey ? '設定済み' : '未設定',
      hasActiveProfile: !!activeProfile,
    })

    // デバッグ: プロファイル設定の確認
    logger.info('[OpenAIストア] プロファイル設定確認:', {
      component: 'useOpenAiStore',
      profileSettings: profileSettings ? 'あり' : 'なし',
      apiProvider: profileSettings?.apiProvider,
      modelName: profileSettings?.modelName,
    })

    const combinedSettings = activeProfile
      ? {
          ...settingsStore.settings,
          ...profileSettings,
        }
      : settingsStore.settings

    // デバッグ: 統合設定の確認
    logger.info('[OpenAIストア] 統合設定確認:', {
      component: 'useOpenAiStore',
      openaiApiKey: combinedSettings.openaiApiKey ? '設定済み' : '未設定',
      openaiApiKeyLength: combinedSettings.openaiApiKey?.length || 0,
      modelName: combinedSettings.modelName,
      apiProvider: combinedSettings.apiProvider,
    })

    // OpenAI基本設定を構築（GeminiのapiSettingsと同様）
    const baseOpenAiSettings: OpenAiApiSettings = {
      apiKey: combinedSettings.openaiApiKey || '',
      model: combinedSettings.modelName,
      temperature: combinedSettings.temperature ?? 1.0,
      maxTokens: combinedSettings.maxTokens,
      topK: 1, // OpenAIは使わないがGeminiApiSettings互換のため必要
      topP: combinedSettings.topP ?? 0.95,
      systemPrompt: combinedSettings.systemPrompt,
      streamingOutput: combinedSettings.streamingOutput,
      enableThinking: combinedSettings.enableThinking,
      includeThoughts: combinedSettings.includeThoughts,
      thinkingBudget: combinedSettings.thinkingBudget,
      modelSettings: profileSettings?.openaiModelSettings,
      functionCalling: combinedSettings.geminiEnableFunctionCalling
        ? {
            enabled: true,
            mode: combinedSettings.functionCallingMode,
            ...(combinedSettings.functionCallingMode === 'any' && combinedSettings.enabledFunctionTools.length > 0 ? { allowedFunctionNames: [...combinedSettings.enabledFunctionTools] } : {}),
          }
        : undefined,
      enableDummyUserPrompt: combinedSettings.enableDummyUserPrompt,
      dummyUserPrompt: combinedSettings.dummyUserPrompt,
      enableDummyModelPrompt: combinedSettings.enableDummyModelPrompt,
      dummyModelPrompt: combinedSettings.dummyModelPrompt,
      prependDummyModelToResponse: combinedSettings.prependDummyModelToResponse,
      enableProofreading: combinedSettings.enableProofreading,
      proofreadingModelName: combinedSettings.proofreadingModelName,
      proofreadingSystemInstruction: combinedSettings.proofreadingSystemInstruction,
      enableThoughtTranslation: combinedSettings.enableThoughtTranslation,
      thoughtTranslationProvider: combinedSettings.thoughtTranslationProvider,
      thoughtTranslationModel: combinedSettings.thoughtTranslationModel,
      deeplApiKey: combinedSettings.deeplApiKey,
    }

    // デバッグ: Function Calling設定をログ出力
    logger.info('[OpenAIストア] Function Calling設定:', {
      component: 'useOpenAiStore',
      geminiEnableFunctionCalling: combinedSettings.geminiEnableFunctionCalling,
      functionCallingMode: combinedSettings.functionCallingMode,
      enabledFunctionTools: combinedSettings.enabledFunctionTools,
      enabledFunctionToolsLength: combinedSettings.enabledFunctionTools?.length,
      functionCalling: baseOpenAiSettings.functionCalling,
    })

    // systemPromptはchatStoreから上書き
    const settings: OpenAiApiSettings = {
      ...baseOpenAiSettings,
      systemPrompt: chatStore.systemPrompt,
    }

    // デバッグ: 最終的な設定をログ出力
    logger.info('[OpenAIストア] 最終設定:', {
      component: 'useOpenAiStore',
      model: settings.model,
      apiKey: settings.apiKey ? `設定済み(${settings.apiKey.substring(0, 10)}...)` : '未設定',
      apiKeyLength: settings.apiKey?.length || 0,
      modelSettings: settings.modelSettings,
    })

    if (!settings.apiKey) {
      const apiError: ApiError = {
        code: 'NO_API_KEY',
        message: 'OpenAI APIキーを設定してください',
        retirable: false,
      }
      setError(apiError.message)
      chatStore.setError(apiError)
      options.onError?.(apiError)
      return false
    }

    const sendSuccess = await chatStore.sendMessage({ skipAddingUserMessage: options.skipAddingUserMessage })
    if (!sendSuccess) {
      return false
    }

    await executeOpenAiRequest(
      chatStore.currentMessages,
      settings,
      createChatCallbacks({
        onError: options.onError,
        onRetryScheduled: options.onRetryScheduled,
        onRetryStarted: options.onRetryStarted,
      })
    )

    logger.info('[自動リトライ] sendChatMessageが正常終了しました', { component: 'useOpenAiStore' })

    return true
  }

  const retryLastUserMessage = async (hooks?: ChatCallbackHooks): Promise<boolean> => {
    const chatStore = useChatStore()
    const messageToRetry = chatStore.retryFromError()
    if (!messageToRetry) {
      logger.info('[自動リトライ] リトライ対象のユーザーメッセージが見つかりませんでした', { component: 'useOpenAiStore' })
      return false
    }

    return await sendChatMessage({
      content: messageToRetry.content,
      attachments: messageToRetry.attachments,
      skipAddingUserMessage: true,
      onError: hooks?.onError,
      onRetryScheduled: hooks?.onRetryScheduled,
      onRetryStarted: hooks?.onRetryStarted,
    })
  }

  /**
   * エラーを設定
   */
  const setError = (errorMessage: string) => {
    currentError.value = errorMessage
    lastErrorTime.value = Date.now()
  }

  /**
   * エラーをクリア
   */
  const clearError = () => {
    currentError.value = null
    lastErrorTime.value = null
  }

  /**
   * ストリーミングを停止
   */
  const stopStreaming = () => {
    if (isStreaming.value) {
      isStreaming.value = false
      streamingContent.value = ''
      streamingMessageId.value = null
    }
  }

  /**
   * 送信を中止
   */
  const cancelSending = () => {
    if (isSending.value) {
      isSending.value = false
    }
    stopStreaming()
  }

  /**
   * 統計をリセット
   */
  const resetStats = () => {
    totalApiCalls.value = 0
    successfulCalls.value = 0
    failedCalls.value = 0
  }

  /**
   * ストア全体をリセット
   */
  const reset = () => {
    isSending.value = false
    isStreaming.value = false
    streamingMessageId.value = null
    streamingContent.value = ''
    clearError()
    resetStats()
  }

  return {
    isSending,
    isStreaming,
    streamingMessageId,
    streamingContent,
    currentError,
    lastErrorTime,
    totalApiCalls,
    successfulCalls,
    failedCalls,

    isIdle,
    hasError,
    successRate,

    sendChatMessage,
    retryLastUserMessage,

    setError,
    clearError,

    stopStreaming,
    cancelSending,

    reset,
    resetStats,
  }
})
