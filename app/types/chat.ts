/**
 * チャット関連の型定義
 * メッセージ、チャット履歴、添付ファイルなどの型
 */

import type { FunctionCall, FunctionCallResult } from './function-calling'

// ============================================================================
// メッセージ関連型
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface AttachedFile {
  id: string
  name: string
  type: string
  size: number
  data: string
  previewUrl?: string
  createdAt: number
}

export interface BaseMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  updatedAt?: number
}

export interface UserMessage extends BaseMessage {
  role: 'user'
  attachments?: AttachedFile[]
}

export interface AssistantMessage extends BaseMessage {
  role: 'assistant'
  thoughts?: string
  translatedThoughts?: string
  functionCalls?: FunctionCall[]
  functionResults?: FunctionCallResult[]
  citations?: Citation[]
  originalContent?: string
  isProofread?: boolean
  error?: boolean
}

export interface SystemMessage extends BaseMessage {
  role: 'system'
}

export type Message = UserMessage | AssistantMessage | SystemMessage

// ============================================================================
// Function Calling関連型
// ============================================================================

export interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<
      string,
      {
        type: string
        description: string
        enum?: string[]
      }
    >
    required?: string[]
  }
}

// ============================================================================
// 検索・引用関連型
// ============================================================================

export interface Citation {
  id: string
  url: string
  title: string
  snippet: string
  confidence?: number
}

export interface SearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
}

// ============================================================================
// チャット関連型
// ============================================================================

export interface PersistentMemory {
  lastUpdated?: number
  [key: string]: string | number | boolean | object | undefined
}

export interface ChatSession {
  id: string
  title: string
  systemPrompt: string
  messages: Message[]
  persistentMemory: PersistentMemory
  createdAt: number
  updatedAt: number
  isArchived?: boolean
  isFavorite?: boolean
}

export interface ChatHistoryMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  isArchived?: boolean
  isFavorite?: boolean
}

// ============================================================================
// API関連型
// ============================================================================

export interface ApiError {
  code: string
  message: string
  details?: string | object
  retirable?: boolean
  attempt?: number
  maxRetries?: number
  nextRetryDelayMs?: number
  retrying?: boolean
}

export type StreamingState = 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'

// ============================================================================
// コンポーネント関連型
// ============================================================================

export interface ChatMessage {
  role: MessageRole
  content: string
  timestamp: number
  error?: boolean
  streaming?: boolean
  thoughts?: string
  translatedThoughts?: string
  functionCalls?: FunctionCall[]
  functionResults?: FunctionCallResult[]
  isStreamingComplete?: boolean
}

export interface MessageBubbleOptions {
  showTimestamp?: boolean
  allowEdit?: boolean
  allowDelete?: boolean
  allowRetry?: boolean
  onEdit?: (message: ChatMessage) => void
  onDelete?: (message: ChatMessage) => void
}

export interface BaseGeminiApiSettings {
  apiKey: string
  model: string
  temperature: number
  maxTokens: number | null
  topK: number
  topP: number
  systemPrompt: string
  streamingOutput: boolean
  enableThinking?: boolean
  includeThoughts?: boolean
  thinkingBudget?: number | null
  geminiEnableGrounding?: boolean
  functionCalling?: {
    enabled: boolean
    mode: 'auto' | 'any' | 'none'
    allowedFunctionNames?: string[]
  }
  // 送信時のみ適用するダミープロンプト
  enableDummyUserPrompt?: boolean
  dummyUserPrompt?: string
  enableDummyModelPrompt?: boolean
  dummyModelPrompt?: string
  // 保存時に先頭へ連結するかどうか
  prependDummyModelToResponse?: boolean
}

export interface ThoughtTranslationConfig {
  enableThoughtTranslation?: boolean
  thoughtTranslationProvider?: 'gemini' | 'deepl'
  thoughtTranslationModel?: string
  deeplApiKey?: string
}

export interface ProofreadingConfig {
  enableProofreading: boolean
  proofreadingModelName: string
  proofreadingSystemInstruction: string
}

export type GeminiApiSettings = BaseGeminiApiSettings & ThoughtTranslationConfig & Partial<ProofreadingConfig>

/** Gemini APIリクエスト用のメッセージ型 */
export type GeminiPart = { text: string; thought?: boolean } | { functionCall: { name: string; args?: Record<string, unknown> } } | { functionResponse: { name: string; response: unknown } }

export interface GeminiMessage {
  role: string
  parts: GeminiPart[]
}

// ============================================================================
// UI状態関連型
// ============================================================================

export interface ChatInputState {
  text: string
  attachments: AttachedFile[]
  isSending: boolean
  isFocused: boolean
}

export interface MessageDisplayState {
  visibleMessages: Message[]
  streamingMessage?: Partial<AssistantMessage>
  streamingState: StreamingState
  error?: ApiError
}

export interface ChatState {
  currentSession: ChatSession | null
  input: ChatInputState
  display: MessageDisplayState
  isEditingSystemPrompt: boolean
}

// ============================================================================
// データベース関連のクエリ型（composables/useDatabase.ts用）
// ============================================================================

export interface GetChatsOptions {
  query?: string
  archived?: boolean
  favorite?: boolean
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}
