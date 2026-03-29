/**
 * APIストア共通ユーティリティ
 *
 * Gemini、OpenAI、Claude、Ollamaストア間で共有するロジック
 */

import { computed, ref } from 'vue'
import { useChatStore } from '~/stores/chat'
import type { ApiError, AssistantMessage, AttachedFile, ChatMessage } from '~/types/chat'

// ============================================================================
// 共通型定義
// ============================================================================

export type ChatCallbackHooks = {
  onError?: (error: ApiError | null) => void
  onRetryScheduled?: (info: { attempt: number; delayMs: number }) => void
  onRetryStarted?: (info: { attempt: number }) => void
}

export type SendChatMessageOptions = {
  content?: string
  attachments?: AttachedFile[]
  skipAddingUserMessage?: boolean
  onError?: (error: ApiError | null) => void
  onRetryScheduled?: (info: { attempt: number; delayMs: number }) => void
  onRetryStarted?: (info: { attempt: number }) => void
}

export interface ToApiErrorOptions {
  extraNonRetriableKeywords?: string[]
  extraNonRetriablePatterns?: RegExp[]
  extraRetriableKeywords?: string[]
  extraRetriablePatterns?: RegExp[]
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * JSON文字列を安全にパースする。パース失敗時はfallbackを返す。
 */
export const safeJsonParse = (json: string, fallback: Record<string, unknown> = {}): Record<string, unknown> => {
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return fallback
  }
}

/**
 * unknownエラーをApiError形式に変換する。
 *
 * ベースキーワード: 'invalid argument', 'invalid api key', 'permission', 'unauthorized', 'format'
 * オプションで追加キーワード・パターンを指定可能。
 * extraRetriableKeywords が指定されている場合、non-retriable判定後でもretriableに上書きする。
 */
export const toApiError = (error: unknown, options?: ToApiErrorOptions): ApiError => {
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

  // non-retriableキーワード判定
  const baseNonRetriableKeywords = ['invalid argument', 'invalid api key', 'permission', 'unauthorized', 'format']
  const allNonRetriableKeywords = options?.extraNonRetriableKeywords ? [...baseNonRetriableKeywords, ...options.extraNonRetriableKeywords] : baseNonRetriableKeywords

  let retirable = !allNonRetriableKeywords.some((keyword) => lowerMessage.includes(keyword))

  // non-retriableパターン判定
  if (retirable && options?.extraNonRetriablePatterns) {
    retirable = !options.extraNonRetriablePatterns.some((pattern) => pattern.test(lowerMessage))
  }

  // retriable上書き判定 (OpenAI用: non-retriableでもretriableキーワードにマッチすれば上書き)
  if (!retirable && options?.extraRetriableKeywords) {
    if (options.extraRetriableKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      retirable = true
    }
  }
  if (!retirable && options?.extraRetriablePatterns) {
    if (options.extraRetriablePatterns.some((pattern) => pattern.test(lowerMessage))) {
      retirable = true
    }
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

// ============================================================================
// チャットストア連携コールバック
// ============================================================================

/**
 * チャットストア操作用の共通コールバックを生成する。
 * 全4ストア(gemini/claude/openai/ollama)で同一のロジック。
 */
export const createChatCallbacks = (hooks?: ChatCallbackHooks) => {
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

// ============================================================================
// APIストア状態管理ファクトリ
// ============================================================================

/**
 * APIストア共通の状態(refs/computed/actions)を生成する。
 * Piniaのsetup関数内から呼び出すこと。
 */
export function createApiStoreState() {
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

  const setError = (errorMessage: string) => {
    currentError.value = errorMessage
    lastErrorTime.value = Date.now()
  }

  const clearError = () => {
    currentError.value = null
    lastErrorTime.value = null
  }

  const stopStreaming = () => {
    if (isStreaming.value) {
      isStreaming.value = false
      streamingContent.value = ''
      streamingMessageId.value = null
    }
  }

  const cancelSending = () => {
    if (isSending.value) {
      isSending.value = false
    }
    stopStreaming()
  }

  const resetStats = () => {
    totalApiCalls.value = 0
    successfulCalls.value = 0
    failedCalls.value = 0
  }

  const reset = () => {
    isSending.value = false
    isStreaming.value = false
    streamingMessageId.value = null
    streamingContent.value = ''
    clearError()
    resetStats()
  }

  return {
    // refs
    isSending,
    isStreaming,
    streamingMessageId,
    streamingContent,
    currentError,
    lastErrorTime,
    totalApiCalls,
    successfulCalls,
    failedCalls,

    // computed
    isIdle,
    hasError,
    successRate,

    // actions
    setError,
    clearError,
    stopStreaming,
    cancelSending,
    resetStats,
    reset,
  }
}
