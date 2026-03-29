/**
 * Ollama API ストア
 * API呼び出し、ストリーミング、エラー処理の状態管理を一元化
 */

import { defineStore } from 'pinia'
import { useOllamaApi, type OllamaCombinedResponse } from '~/composables/useOllamaApi'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { ApiError, ChatMessage, OllamaApiSettings } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/lib/logger'
import { createApiStoreState, createChatCallbacks, isAbortError, sleep, toApiError, type ChatCallbackHooks, type SendChatMessageOptions } from '~/lib/apiStoreCommon'

export const useOllamaStore = defineStore('ollama', () => {
  const state = createApiStoreState()
  const ollamaApi = useOllamaApi()
  const settingsStore = useSettingsStore()
  const profilesStore = useSettingsProfilesStore()

  const getActiveProfileSettings = () => {
    return profilesStore.activeProfileSettingsWithTemporary
  }

  /**
   * ストリーミングレスポンスを処理する
   */
  const handleStreamingResponse = async (
    messages: ChatMessage[],
    settings: OllamaApiSettings,
    callbacks: {
      onMessageStart: (message: ChatMessage) => number
      onMessageUpdate: (index: number, updates: Partial<ChatMessage>) => void
    }
  ) => {
    let messageIndex: number = -1
    let assistantMessage: ChatMessage | null = null
    let completed = false

    state.isStreaming.value = true
    state.streamingContent.value = ''
    state.streamingMessageId.value = null

    let accumulatedToolCalls: FunctionCall[] = []
    let accumulatedToolResults: FunctionCallResult[] = []

    const controller = state.createAbortController()
    try {
      for await (const chunk of ollamaApi.generateContentStream(messages, settings, { signal: controller.signal })) {
        if (chunk.type === 'chunk') {
          if (messageIndex === -1) {
            assistantMessage = {
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            }
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
                functionCalls: [],
                functionResults: [],
              })
            } else {
              chatStore.addMessage(assistantMessage)
              messageIndex = chatStore.currentMessages.length - 1
              state.streamingMessageId.value = assistantMessage.timestamp?.toString() || null
            }
          }

          if (chunk.contentText && assistantMessage) {
            assistantMessage.content += chunk.contentText
            state.streamingContent.value = assistantMessage.content
          }

          if (chunk.functionCalls) {
            accumulatedToolCalls = chunk.functionCalls
          }

          if ('functionResults' in chunk.data && chunk.data.functionResults) {
            accumulatedToolResults = chunk.data.functionResults as FunctionCallResult[]
          }

          if (messageIndex !== -1 && assistantMessage) {
            callbacks.onMessageUpdate(messageIndex, {
              content: assistantMessage.content,
              ...(accumulatedToolCalls.length > 0 && { functionCalls: accumulatedToolCalls }),
              ...(accumulatedToolResults.length > 0 && { functionResults: accumulatedToolResults }),
            })
          }
        }
      }

      state.successfulCalls.value++
      completed = true
    } catch (error) {
      if (isAbortError(error)) {
        completed = true
        return
      }
      if (messageIndex !== -1 && assistantMessage) {
        callbacks.onMessageUpdate(messageIndex, {
          content: assistantMessage.content,
          error: true,
        })
      }

      throw error
    } finally {
      state.isStreaming.value = false
      state.streamingContent.value = ''
      state.streamingMessageId.value = null

      if (completed && messageIndex !== -1 && assistantMessage) {
        callbacks.onMessageUpdate(messageIndex, {
          content: assistantMessage.content,
          ...(accumulatedToolCalls.length > 0 && { functionCalls: accumulatedToolCalls }),
          ...(accumulatedToolResults.length > 0 && { functionResults: accumulatedToolResults }),
          isStreamingComplete: true,
        })
      }
    }
  }

  /**
   * 非ストリーミングレスポンスを処理する
   */
  const handleNonStreamingResponse = async (
    messages: ChatMessage[],
    settings: OllamaApiSettings,
    callbacks: {
      onMessageAdd: (message: ChatMessage) => void
    }
  ) => {
    const response: OllamaCombinedResponse = await ollamaApi.generateContent(messages, settings)

    let finalContent = response.content

    if (settings.prependDummyModelToResponse && settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
      finalContent = `${settings.dummyModelPrompt}\n${finalContent}`
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
      ...(response.functionCalls && { functionCalls: response.functionCalls }),
      ...(response.functionResults && { functionResults: response.functionResults }),
    }

    callbacks.onMessageAdd(assistantMessage)
    state.successfulCalls.value++
  }

  /**
   * Ollamaリクエストを実行する統合処理
   */
  const executeOllamaRequest = async (
    messages: ChatMessage[],
    settings: OllamaApiSettings,
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
            logger.info('[自動リトライ] 初回の試行で成功しました', { component: 'useOllamaStore' })
          }
          break
        } catch (error) {
          const apiError = toApiError(error)
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

    const activeProfile = profilesStore.activeProfile
    const profileSettings = getActiveProfileSettings()
    const combinedSettings = activeProfile
      ? {
          ...settingsStore.settings,
          ...profileSettings,
        }
      : settingsStore.settings

    const settings: OllamaApiSettings = {
      baseUrl: combinedSettings.ollamaBaseUrl,
      apiKey: combinedSettings.ollamaApiKey,
      model: combinedSettings.modelName,
      temperature: combinedSettings.temperature ?? 0.7,
      maxTokens: combinedSettings.maxTokens,
      topK: combinedSettings.topK ?? undefined,
      topP: combinedSettings.topP ?? 0.95,
      systemPrompt: chatStore.systemPrompt,
      streamingOutput: combinedSettings.streamingOutput,
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
    }

    if (!settings.baseUrl) {
      const apiError: ApiError = {
        code: 'NO_BASE_URL',
        message: 'OllamaのベースURLを設定してください',
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
      await executeOllamaRequest(
        chatStore.currentMessages,
        settings,
        createChatCallbacks({
          onError: options.onError,
          onRetryScheduled: options.onRetryScheduled,
          onRetryStarted: options.onRetryStarted,
        })
      )
      logger.info('[Ollamaストア] sendChatMessageが正常終了しました', { component: 'useOllamaStore' })
      return true
    } catch {
      return false
    }
  }

  const retryLastUserMessage = async (hooks?: ChatCallbackHooks): Promise<boolean> => {
    const chatStore = useChatStore()
    const messageToRetry = chatStore.retryFromError()
    if (!messageToRetry) {
      logger.info('[Ollamaストア] リトライ対象のユーザーメッセージが見つかりませんでした', { component: 'useOllamaStore' })
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
