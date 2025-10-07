/**
 * Claude API ストア
 * API呼び出し、ストリーミング、エラー処理の状態管理を一元化
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useClaudeApi, type ClaudeCombinedResponse } from '~/composables/useClaudeApi'
import { proofreadText } from '~/composables/useProofreader'
import { translateThoughts } from '~/composables/useTranslator'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import type { ApiError, AssistantMessage, AttachedFile, ChatMessage, ClaudeApiSettings } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'

export const useClaudeStore = defineStore('claude', () => {
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

  const claudeApi = useClaudeApi()

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

    const lowerMessage = message.toLowerCase()
    const nonRetriableKeywords = ['invalid argument', 'invalid api key', 'permission', 'unauthorized', 'format', 'quota']
    const nonRetriablePatterns = [/api\s*キーが不正/, /不正な\s*api\s*キー/]
    let retirable = !nonRetriableKeywords.some((keyword) => lowerMessage.includes(keyword))

    if (retirable) {
      retirable = !nonRetriablePatterns.some((pattern) => pattern.test(lowerMessage))
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
   * ストリーミングレスポンスを処理する
   */
  const handleStreamingResponse = async (
    messages: ChatMessage[],
    settings: ClaudeApiSettings,
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

    let accumulatedThoughts: string | undefined
    let translated: string | undefined
    let accumulatedToolCalls: FunctionCall[] = []
    let accumulatedToolResults: FunctionCallResult[] = []

    try {
      for await (const chunk of claudeApi.generateContentStream(messages, settings)) {
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
              logger.info('[Claudeストア] アシスタントメッセージを作成（インデックス）:', { component: 'useClaudeStore' }, messageIndex)
            }
          }

          // コンテンツの更新
          if (chunk.contentText && assistantMessage) {
            assistantMessage.content += chunk.contentText
            streamingContent.value = assistantMessage.content
          }

          // 思考プロセスは将来対応予定（Claudeの拡張思考モード）
          // 現時点ではClaudeStreamingChunkにthoughtsは含まれない

          // Tool Call の蓄積
          if (chunk.toolCalls) {
            accumulatedToolCalls = chunk.toolCalls
          }

          // Tool Call 結果の蓄積
          if ('toolResults' in chunk.data && chunk.data.toolResults) {
            accumulatedToolResults = chunk.data.toolResults as FunctionCallResult[]
          }

          if (messageIndex !== -1 && assistantMessage) {
            callbacks.onMessageUpdate(messageIndex, {
              content: assistantMessage.content,
              ...(accumulatedThoughts && { thoughts: accumulatedThoughts }),
              ...(accumulatedToolCalls.length > 0 && { functionCalls: accumulatedToolCalls }),
              ...(accumulatedToolResults.length > 0 && { functionResults: accumulatedToolResults }),
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
            logger.warn('思考プロセスの翻訳に失敗しました:', { component: 'useClaudeStore' }, error)
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
          logger.warn('校正に失敗しました:', { component: 'useClaudeStore' }, error)
        }
      }

      successfulCalls.value++
      completed = true
    } catch (error) {
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
          ...(accumulatedToolCalls.length > 0 && { functionCalls: accumulatedToolCalls }),
          ...(accumulatedToolResults.length > 0 && { functionResults: accumulatedToolResults }),
          isStreamingComplete: true, // ストリーミング完了フラグ
        })
      }
    }
  }

  /**
   * 非ストリーミングレスポンスを処理する
   */
  const handleNonStreamingResponse = async (
    messages: ChatMessage[],
    settings: ClaudeApiSettings,
    callbacks: {
      onMessageAdd: (message: ChatMessage) => void
    }
  ) => {
    const response: ClaudeCombinedResponse = await claudeApi.generateContent(messages, settings)

    // 思考プロセスを抽出
    const thoughtExtraction = claudeApi.extractThoughtsFromResponse(response)

    logger.info('[Claudeストア] Tool呼び出しを含む応答:', {
      toolCalls: response.toolCalls,
      toolResults: response.toolResults,
    })

    let translated: string | undefined
    if (settings.includeThoughts && settings.enableThoughtTranslation && thoughtExtraction.thoughts) {
      try {
        translated = await translateThoughts({
          provider: settings.thoughtTranslationProvider === 'deepl' ? 'deepl' : 'gemini',
          text: thoughtExtraction.thoughts,
          settings: {
            apiKey: settings.apiKey,
            thoughtTranslationModel: settings.thoughtTranslationModel || 'gemini-2.0-flash-lite',
            deeplApiKey: settings.deeplApiKey || '',
          },
        })
      } catch (error) {
        logger.warn('思考プロセスの翻訳に失敗しました:', { component: 'useClaudeStore' }, error)
      }
    }

    // 校正（任意）: 非ストリーミングでも応答生成後に校正
    let finalContent = thoughtExtraction.content
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
        logger.warn('校正に失敗しました:', { component: 'useClaudeStore' }, error)
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
        thoughtExtraction.thoughts && {
          thoughts: thoughtExtraction.thoughts,
        }),
      ...(isProofread && { isProofread: true }),
      ...(translated && { translatedThoughts: translated }),
      ...(response.toolCalls && {
        functionCalls: response.toolCalls,
      }),
      ...(response.toolResults && {
        functionResults: response.toolResults,
      }),
    }

    logger.info('[Claudeストア] アシスタントメッセージを作成:', { component: 'useClaudeStore' }, assistantMessage)

    callbacks.onMessageAdd(assistantMessage)
    successfulCalls.value++
  }

  /**
   * Claudeメッセージを送信する統合処理
   */
  const executeClaudeRequest = async (
    messages: ChatMessage[],
    settings: ClaudeApiSettings,
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
            await handleStreamingResponse(messages, settings, {
              onMessageStart: callbacks.onAssistantMessageStart,
              onMessageUpdate: callbacks.onMessageUpdate,
            })
          } else {
            await handleNonStreamingResponse(messages, settings, {
              onMessageAdd: callbacks.onAssistantMessageAdd,
            })
          }

          callbacks.onError?.(null)
          if (attempt > 1) {
            logger.info('[自動リトライ] 再試行に成功しました', { attempt })
          } else {
            logger.info('[自動リトライ] 初回の試行で成功しました', { component: 'useClaudeStore' })
          }
          break
        } catch (error) {
          const apiError = toApiError(error)
          failedCalls.value++
          setError(apiError.message)

          const retriesUsed = attempt - 1
          const shouldRetry = retrySettings.enableAutoRetry && apiError.retirable !== false && retriesUsed < maxRetries

          const retryNumber = retriesUsed + 1
          const delayMs = shouldRetry
            ? retrySettings.useFixedRetryDelay
              ? Math.max(1, retrySettings.fixedRetryDelaySeconds) * 1000
              : Math.min(Math.pow(2, retryNumber - 1) * 1000, Math.max(1, retrySettings.maxBackoffDelaySeconds) * 1000)
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
              delayMs,
            })
          }

          if (!shouldRetry || !delayMs) {
            logger.info('[自動リトライ] 再試行を断念します', {
              finalAttempt: attempt,
              errorCode: apiError.code,
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
    const combinedSettings = activeProfile
      ? {
          ...settingsStore.settings,
          ...profileSettings,
        }
      : settingsStore.settings

    const settings: ClaudeApiSettings = {
      apiKey: settingsStore.claudeApiSettings.apiKey,
      model: combinedSettings.modelName,
      maxTokens: combinedSettings.maxTokens ?? 4096, // ClaudeではmaxTokensが必須
      temperature: combinedSettings.temperature ?? 1.0,
      topK: combinedSettings.topK ?? 1,
      topP: combinedSettings.topP ?? 0.95,
      systemPrompt: chatStore.systemPrompt,
      streamingOutput: combinedSettings.streamingOutput,
      enableThinking: combinedSettings.enableThinking,
      includeThoughts: combinedSettings.includeThoughts,
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
      enableThoughtTranslation: combinedSettings.enableThoughtTranslation,
      thoughtTranslationProvider: combinedSettings.thoughtTranslationProvider,
      thoughtTranslationModel: combinedSettings.thoughtTranslationModel,
      deeplApiKey: combinedSettings.deeplApiKey,
      enableProofreading: combinedSettings.enableProofreading,
      proofreadingModelName: combinedSettings.proofreadingModelName,
      proofreadingSystemInstruction: combinedSettings.proofreadingSystemInstruction,
    }

    if (!settings.apiKey) {
      const apiError: ApiError = {
        code: 'NO_API_KEY',
        message: 'Claude APIキーを設定してください',
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

    await executeClaudeRequest(
      chatStore.currentMessages,
      settings,
      createChatCallbacks({
        onError: options.onError,
        onRetryScheduled: options.onRetryScheduled,
        onRetryStarted: options.onRetryStarted,
      })
    )

    logger.info('[自動リトライ] sendChatMessageが正常終了しました', { component: 'useClaudeStore' })

    return true
  }

  const retryLastUserMessage = async (hooks?: ChatCallbackHooks): Promise<boolean> => {
    const chatStore = useChatStore()
    const messageToRetry = chatStore.retryFromError()
    if (!messageToRetry) {
      logger.info('[自動リトライ] リトライ対象のユーザーメッセージが見つかりませんでした', { component: 'useClaudeStore' })
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
