/**
 * Gemini API ストア
 * API呼び出し、ストリーミング、エラー処理の状態管理を一元化
 */

import type { Content } from '@google/genai'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useGeminiApi, type CombinedResponse } from '~/composables/useGeminiApi'
import { proofreadText } from '~/composables/useProofreader'
import { translateThoughts } from '~/composables/useTranslator'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import type { ApiError, ChatMessage, GeminiApiSettings, GeminiMessage } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'

export const useGeminiStore = defineStore('gemini', () => {
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

  const geminiApi = useGeminiApi()

  /**
   * チャットメッセージをGemini API用の形式に変換する
   */
  const prepareMessagesForApi = (messages: ChatMessage[]): GeminiMessage[] => {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }))
  }

  /**
   * API設定から生成設定を構築する
   */
  const buildGenerationConfig = (settings: GeminiApiSettings): Record<string, unknown> => {
    const config: Record<string, unknown> = {
      temperature: settings.temperature,
      maxOutputTokens: settings.maxTokens,
      topK: settings.topK,
      topP: settings.topP,
    }

    // 思考プロセス設定を追加（enableThinkingが有効な場合のみ）
    if (settings.enableThinking) {
      config.thinkingConfig = {
        includeThoughts: settings.includeThoughts ?? false,
        thinkingBudget: settings.thinkingBudget ?? -1, // nullの場合は-1（自動）を使用
      }
    }

    return config
  }

  /**
   * システムインストラクションを準備する
   */
  const prepareSystemInstruction = (settings: GeminiApiSettings): Content | null => {
    return settings.systemPrompt
      ? {
          role: 'user',
          parts: [{ text: settings.systemPrompt }],
        }
      : null
  }

  const settingsStore = useSettingsStore()

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
    const nonRetriableKeywords = ['invalid argument', 'invalid api key', 'permission', 'unauthorized', 'format', 'quota', '不正']
    const retirable = !nonRetriableKeywords.some((keyword) => lowerMessage.includes(keyword))

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
    messagesForApi: GeminiMessage[],
    generationConfig: Record<string, unknown>,
    systemInstruction: Content | null,
    settings: GeminiApiSettings,
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
    let accumulatedFunctionCalls: FunctionCall[] = []
    let accumulatedFunctionResults: FunctionCallResult[] = []

    try {
      for await (const chunk of geminiApi.generateContentStream(messagesForApi, generationConfig, systemInstruction, settings)) {
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
            // ChatInterface.vueが-1を返すので、こちらでメッセージを直接追加
            const chatStore = useChatStore()
            chatStore.addMessage(assistantMessage)
            messageIndex = chatStore.currentMessages.length - 1
            streamingMessageId.value = assistantMessage.timestamp?.toString() || null
            console.log('[Geminiストア] アシスタントメッセージを作成（インデックス）:', messageIndex)
          }

          // コンテンツの更新
          if (chunk.contentText && assistantMessage) {
            assistantMessage.content += chunk.contentText
            streamingContent.value = assistantMessage.content
          }

          // 思考プロセスが含まれている場合は蓄積
          if (settings.includeThoughts && chunk.thoughts) {
            accumulatedThoughts = chunk.thoughts
          }

          // Function Call の蓄積
          if (chunk.functionCalls) {
            accumulatedFunctionCalls = chunk.functionCalls
          }

          // Function Call 結果の蓄積
          if ('functionResults' in chunk.data && chunk.data.functionResults) {
            accumulatedFunctionResults = chunk.data.functionResults as FunctionCallResult[]
          }

          if (messageIndex !== -1 && assistantMessage) {
            callbacks.onMessageUpdate(messageIndex, {
              content: assistantMessage.content,
              ...(accumulatedThoughts && { thoughts: accumulatedThoughts }),
              ...(accumulatedFunctionCalls.length > 0 && { functionCalls: accumulatedFunctionCalls }),
              ...(accumulatedFunctionResults.length > 0 && { functionResults: accumulatedFunctionResults }),
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
          } catch (e) {
            console.warn('Thought translation failed:', e)
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
            ;(assistantMessage as unknown as { isProofread?: boolean }).isProofread = true
            // 校正後の内容をUIに反映
            if (messageIndex !== -1) {
              callbacks.onMessageUpdate(messageIndex, {
                content: proof,
                ...{ isProofread: true },
              } as Partial<ChatMessage>)
            }
          }
        } catch (e) {
          console.warn('Proofreading failed:', e)
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
      // これによりChatInterfaceで!geminiStore.isStreamingの条件でcompleteStreamingが呼ばれる
      if (completed && messageIndex !== -1 && assistantMessage) {
        callbacks.onMessageUpdate(messageIndex, {
          content: assistantMessage.content,
          ...(accumulatedThoughts && { thoughts: accumulatedThoughts }),
          ...(translated && { translatedThoughts: translated }),
          ...(accumulatedFunctionCalls.length > 0 && { functionCalls: accumulatedFunctionCalls }),
          ...(accumulatedFunctionResults.length > 0 && { functionResults: accumulatedFunctionResults }),
          isStreamingComplete: true, // ストリーミング完了フラグ
        })
      }
    }
  }

  /**
   * 非ストリーミングレスポンスを処理する
   */
  const handleNonStreamingResponse = async (
    messagesForApi: GeminiMessage[],
    generationConfig: Record<string, unknown>,
    systemInstruction: Content | null,
    settings: GeminiApiSettings,
    callbacks: {
      onMessageAdd: (message: ChatMessage) => void
    }
  ) => {
    const response: CombinedResponse = await geminiApi.generateContent(messagesForApi, generationConfig, systemInstruction, settings)

    if (response.candidates && response.candidates[0]) {
      // 思考プロセスを抽出
      const thoughtExtraction = geminiApi.extractThoughtsFromResponse(response)

      console.log('[Geminiストア] 関数呼び出しを含む応答:', {
        functionCalls: response.functionCalls,
        functionResults: response.functionResults,
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
        } catch (e) {
          console.warn('Thought translation failed:', e)
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
        } catch (e) {
          console.warn('Proofreading failed:', e)
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
        ...(response.functionCalls && {
          functionCalls: response.functionCalls,
        }),
        ...(response.functionResults && {
          functionResults: response.functionResults,
        }),
      }

      console.log('[Geminiストア] アシスタントメッセージを作成:', assistantMessage)

      callbacks.onMessageAdd(assistantMessage)
      successfulCalls.value++
    } else {
      throw new Error('API応答の形式が不正です')
    }
  }

  /**
   * Geminiメッセージを送信する統合処理
   */
  const sendMessage = async (
    messages: ChatMessage[],
    settings: GeminiApiSettings,
    callbacks: {
      onAssistantMessageStart: (message: ChatMessage) => number
      onAssistantMessageAdd: (message: ChatMessage) => void
      onMessageUpdate: (index: number, updates: Partial<ChatMessage>) => void
      onError?: (error: ApiError | null) => void
    }
  ) => {
    if (isSending.value || isStreaming.value) {
      throw new Error('別のメッセージが処理中です')
    }

    try {
      isSending.value = true
      clearError()
      callbacks.onError?.(null)

      const messagesForApi: GeminiMessage[] = prepareMessagesForApi(messages)

      const generationConfig = buildGenerationConfig(settings)
      const systemInstruction = prepareSystemInstruction(settings)
      const retrySettings = settingsStore.retrySettings
      const maxRetries = Math.max(0, retrySettings.maxRetries)
      let attempt = 0

      while (true) {
        attempt++
        totalApiCalls.value++

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

          if (!shouldRetry || !delayMs) {
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

    sendMessage,

    setError,
    clearError,

    stopStreaming,
    cancelSending,

    reset,
    resetStats,
  }
})
