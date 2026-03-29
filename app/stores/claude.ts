/**
 * Claude API ストア
 * API呼び出し、ストリーミング、エラー処理の状態管理を一元化
 */

import { defineStore } from 'pinia'
import { useClaudeApi, type ClaudeCombinedResponse } from '~/composables/useClaudeApi'
import { createApiStoreState, createChatCallbacks, sleep, toApiError, type ChatCallbackHooks, type SendChatMessageOptions } from '~/lib/apiStoreCommon'
import { proofreadText } from '~/lib/proofreader'
import { translateThoughts } from '~/lib/translator'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { ApiError, ChatMessage, ClaudeApiSettings } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/lib/logger'

export const useClaudeStore = defineStore('claude', () => {
  const state = createApiStoreState()

  const claudeApi = useClaudeApi()

  const settingsStore = useSettingsStore()
  const profilesStore = useSettingsProfilesStore()

  // 一時的な設定を含むプロファイル設定を取得
  const getActiveProfileSettings = () => {
    return profilesStore.activeProfileSettingsWithTemporary
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
    state.isStreaming.value = true
    state.streamingContent.value = ''
    state.streamingMessageId.value = null

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
              state.streamingContent.value = assistantMessage.content
            }
            const chatStore = useChatStore()
            const reuseIndex = callbacks.onMessageStart(assistantMessage)

            if (reuseIndex >= 0) {
              const existingMessage = chatStore.visibleMessages[reuseIndex]
              if (!existingMessage || existingMessage.role !== 'assistant') {
                throw new Error(`Invalid message at reuse index ${reuseIndex}`)
              }
              const baseTimestamp = existingMessage.createdAt ?? Date.now()
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
              logger.info('[Claudeストア] アシスタントメッセージを作成（インデックス）:', { component: 'useClaudeStore' }, messageIndex)
            }
          }

          // コンテンツの更新
          if (chunk.contentText && assistantMessage) {
            assistantMessage.content += chunk.contentText
            state.streamingContent.value = assistantMessage.content
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
    state.successfulCalls.value++
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
          const apiError = toApiError(error, {
            extraNonRetriableKeywords: ['quota'],
            extraNonRetriablePatterns: [/api\s*キーが不正/, /不正な\s*api\s*キー/],
          })
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
    } catch {
      return false
    }
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

  return {
    ...state,

    sendChatMessage,
    retryLastUserMessage,
  }
})
