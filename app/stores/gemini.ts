/**
 * Gemini API ストア
 * API呼び出し、ストリーミング、エラー処理の状態管理を一元化
 */

import type { Content } from '@google/genai'
import { defineStore } from 'pinia'
import { createApiStoreState, createChatCallbacks, sleep, toApiError, type ChatCallbackHooks, type SendChatMessageOptions } from '~/lib/apiStoreCommon'
import { useGeminiApi, type CombinedResponse } from '~/composables/useGeminiApi'
import { proofreadText } from '~/lib/proofreader'
import { translateThoughts } from '~/lib/translator'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { ApiError, AssistantMessage, ChatMessage, GeminiApiSettings, GeminiMessage, GeminiPart } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/lib/logger'

export const useGeminiStore = defineStore('gemini', () => {
  const state = createApiStoreState()

  const geminiApi = useGeminiApi()

  /**
   * チャットメッセージをGemini API用の形式に変換する
   */
  const normalizeMimeType = (mime: string | undefined): string => {
    if (!mime || mime.trim().length === 0) {
      return 'application/octet-stream'
    }
    if (mime === 'image/jpg') return 'image/jpeg'
    return mime
  }

  const prepareMessagesForApi = (messages: ChatMessage[]): GeminiMessage[] => {
    return messages.map((msg) => {
      const parts: GeminiPart[] = []

      if (msg.content && msg.content.length > 0) {
        parts.push({ text: msg.content })
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const file of msg.attachments) {
          parts.push({ inlineData: { mimeType: normalizeMimeType(file.type), data: file.data } })
        }
      }

      if (parts.length === 0) {
        parts.push({ text: '' })
      }

      return {
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts,
      }
    })
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
  const profilesStore = useSettingsProfilesStore()

  // 一時的な設定を含むプロファイル設定を取得
  const getActiveProfileSettings = () => {
    return profilesStore.activeProfileSettingsWithTemporary
  }

  const geminiToApiErrorOptions = {
    extraNonRetriableKeywords: ['quota'],
    extraNonRetriablePatterns: [/api\s*キーが不正/, /不正な\s*api\s*キー/],
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
    state.isStreaming.value = true
    state.streamingContent.value = ''
    state.streamingMessageId.value = null

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
              state.streamingContent.value = assistantMessage.content
            }
            const chatStore = useChatStore()
            const reuseIndex = callbacks.onMessageStart(assistantMessage)

            if (reuseIndex >= 0) {
              const existingMessage = chatStore.visibleMessages[reuseIndex] as AssistantMessage | undefined
              const baseTimestamp = existingMessage?.createdAt ?? Date.now()
              assistantMessage.timestamp = baseTimestamp
              messageIndex = reuseIndex
              state.streamingMessageId.value = baseTimestamp.toString()
              state.streamingContent.value = assistantMessage.content

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
              state.streamingMessageId.value = assistantMessage.timestamp?.toString() || null
              logger.info('[Geminiストア] アシスタントメッセージを作成（インデックス）:', { component: 'useGeminiStore' }, messageIndex)
            }
          }

          // コンテンツの更新
          if (chunk.contentText && assistantMessage) {
            assistantMessage.content += chunk.contentText
            state.streamingContent.value = assistantMessage.content
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
          } catch (error) {
            logger.warn('思考プロセスの翻訳に失敗しました:', { component: 'useGeminiStore' }, error)
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
          logger.warn('校正に失敗しました:', { component: 'useGeminiStore' }, error)
        }
      }

      state.successfulCalls.value++
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
      state.isStreaming.value = false
      state.streamingContent.value = ''
      state.streamingMessageId.value = null

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

      logger.info('[Geminiストア] 関数呼び出しを含む応答:', {
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
        } catch (error) {
          logger.warn('思考プロセスの翻訳に失敗しました:', { component: 'useGeminiStore' }, error)
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
          logger.warn('校正に失敗しました:', { component: 'useGeminiStore' }, error)
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

      logger.info('[Geminiストア] アシスタントメッセージを作成:', { component: 'useGeminiStore' }, assistantMessage)

      callbacks.onMessageAdd(assistantMessage)
      state.successfulCalls.value++
    } else {
      throw new Error('API応答の形式が不正です')
    }
  }

  /**
   * Geminiメッセージを送信する統合処理
   */
  const executeGeminiRequest = async (
    messages: ChatMessage[],
    settings: GeminiApiSettings,
    callbacks: {
      onAssistantMessageStart: (message: ChatMessage) => number
      onAssistantMessageAdd: (message: ChatMessage) => void
      onMessageUpdate: (index: number, updates: Partial<ChatMessage>) => void
      onError?: (error: ApiError | null) => void
      onRetryScheduled?: (info: { attempt: number; delayMs: number }) => void
      onRetryStarted?: (info: { attempt: number }) => void
    }
  ) => {
    if (state.isSending.value || state.isStreaming.value) {
      throw new Error('別のメッセージが処理中です')
    }

    logger.info('[自動リトライ] リクエスト送信を開始します', {
      messageCount: messages.length,
      streaming: settings.streamingOutput,
    })

    try {
      state.isSending.value = true
      state.clearError()
      callbacks.onError?.(null)

      const messagesForApi: GeminiMessage[] = prepareMessagesForApi(messages)

      const generationConfig = buildGenerationConfig(settings)
      const systemInstruction = prepareSystemInstruction(settings)
      const retrySettings = settingsStore.retrySettings
      const maxRetries = Math.max(0, retrySettings.maxRetries)
      let attempt = 0

      while (true) {
        attempt++
        state.totalApiCalls.value++

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
            logger.info('[自動リトライ] 初回の試行で成功しました', { component: 'useGeminiStore' })
          }
          break
        } catch (error) {
          const apiError = toApiError(error, geminiToApiErrorOptions)
          state.failedCalls.value++
          state.setError(apiError.message)

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
      state.isSending.value = false
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

    const settings = {
      ...settingsStore.apiSettings,
      // プロファイル設定で上書き
      model: combinedSettings.modelName,
      temperature: combinedSettings.temperature ?? 1.0,
      maxTokens: combinedSettings.maxTokens,
      topK: combinedSettings.topK ?? 1,
      topP: combinedSettings.topP ?? 0.95,
      geminiEnableGrounding: combinedSettings.geminiEnableGrounding,
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
      systemPrompt: chatStore.systemPrompt,
    }

    if (!settings.apiKey) {
      const apiError: ApiError = {
        code: 'NO_API_KEY',
        message: 'APIキーを設定してください',
        retirable: false,
      }
      state.setError(apiError.message)
      chatStore.setError(apiError)
      options.onError?.(apiError)
      return false
    }

    const sendSuccess = await chatStore.sendMessage({ skipAddingUserMessage: options.skipAddingUserMessage })
    if (!sendSuccess) {
      return false
    }

    try {
      await executeGeminiRequest(
        chatStore.currentMessages,
        settings,
        createChatCallbacks({
          onError: options.onError,
          onRetryScheduled: options.onRetryScheduled,
          onRetryStarted: options.onRetryStarted,
        })
      )
      logger.info('[自動リトライ] sendChatMessageが正常終了しました', { component: 'useGeminiStore' })
      return true
    } catch {
      return false
    }
  }

  const retryLastUserMessage = async (hooks?: ChatCallbackHooks): Promise<boolean> => {
    const chatStore = useChatStore()
    const messageToRetry = chatStore.retryFromError()
    if (!messageToRetry) {
      logger.info('[自動リトライ] リトライ対象のユーザーメッセージが見つかりませんでした', { component: 'useGeminiStore' })
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

  return {
    ...state,

    sendChatMessage,
    retryLastUserMessage,
  }
})
