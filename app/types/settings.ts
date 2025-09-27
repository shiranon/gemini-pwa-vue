/**
 * 設定関連の型定義
 */

import { defaultEnabledFunctionToolNames } from '~/utils/defaults'

// ============================================================================
// 基本設定型
// ============================================================================

/** Gemini APIパラメータ設定 */
export interface GeminiParameters {
  maxTokens: number | null
  temperature: number | null
  topK: number | null
  topP: number | null
  presencePenalty: number | null
  frequencyPenalty: number | null
  thinkingBudget: number | null
}

/** Gemini拡張機能設定 */
export interface GeminiAdvancedSettings {
  streamingOutput: boolean
  enableThinking: boolean
  includeThoughts: boolean
  geminiEnableFunctionCalling: boolean
  enabledFunctionTools: string[]
  functionCallingMode: 'auto' | 'any' | 'none'
  geminiEnableGrounding: boolean
}

/** 思考プロセス翻訳設定 */
export interface ThoughtTranslationSettings {
  enableThoughtTranslation: boolean
  thoughtTranslationProvider: 'gemini' | 'deepl'
  thoughtTranslationModel: string
  deeplApiKey: string
}

/** リトライ設定 */
export interface RetrySettings {
  enableAutoRetry: boolean
  maxRetries: number
  useFixedRetryDelay: boolean
  fixedRetryDelaySeconds: number
  maxBackoffDelaySeconds: number
}

/** 校正機能設定 */
export interface ProofreadingSettings {
  enableProofreading: boolean
  proofreadingModelName: string
  proofreadingSystemInstruction: string
}

/** 要約機能設定 */
export interface SummarySettings {
  enableSummary: boolean
  summaryModelName: string
  summarySystemInstruction: string
}

// ============================================================================
// UI設定型
// ============================================================================

export type ThemePresetId = 'default' | 'midnight' | 'forest' | 'rose' | 'noir'

/** テーマとスタイル設定 */
export interface ThemeSettings {
  themePreset: ThemePresetId
  fontFamily: string
  fontMode: 'preset' | 'system' | 'upload'
  systemFontName: string
  selectedPreset: string
  uploadedFont: {
    name: string
    dataUrl: string
  } | null
  /** メッセージ本文のフォントサイズ(px) */
  messageFontSize: number
  /** Function Calling表示のフォントサイズ(px) */
  functionCallFontSize: number
  /** 思考プロセス表示のフォントサイズ(px) */
  thoughtFontSize: number
  /** メッセージバブルの角丸(px) */
  messageBubbleRadius: number
  /** メッセージバブルの左右パディング(px) */
  messageBubblePaddingX: number
  /** メッセージバブルの上下パディング(px) */
  messageBubblePaddingY: number
  /** メッセージ内の画像幅(%). nullの場合は100% */
  messageImageWidthPercent: number | null
  /** メッセージ内の画像配置 */
  messageImageJustify: 'start' | 'center' | 'end'
  /** ユーザーメッセージの背景色 */
  userBubbleColor: string
  /** アシスタントメッセージの背景色 */
  assistantBubbleColor: string
}

/** 背景画像設定 */
export interface BackgroundImageSettings {
  backgroundImageBlob: Blob | null
  /** 永続化用の画像データURL（base64）。Blobは保存しない */
  backgroundImageDataUrl: string | null
  /** オーバーレイの基準色（#RRGGBB） */
  overlayColor: string
  overlayOpacity: number
  messageOpacity: number
}

/** 操作・ナビゲーション設定 */
export interface NavigationSettings {
  enterToSend: boolean
  enableSwipeNavigation: boolean
  hideSystemPromptInChat: boolean
}

/** アバター個別設定 */
export interface AvatarConfig {
  imageUrl?: string
}

/** アバター設定 */
export interface AvatarSettings {
  avatarEnabled: boolean
  avatarSize: number // アイコンサイズ(px): 10-150
  defaultUserAvatar: AvatarConfig
  defaultAssistantAvatar: AvatarConfig
}

/** チャット個別アバター設定 */
export interface ChatAvatarSettings {
  userAvatar?: AvatarConfig
  assistantAvatar?: AvatarConfig
}

// ============================================================================
// プロファイル設定型
// ============================================================================

/** 設定プロファイルに含める項目のみを定義 */
export interface SettingsProfileData {
  // API・モデル設定
  modelName: string
  systemPrompt: string

  // Geminiパラメータ
  maxTokens: number | null
  temperature: number | null
  topK: number | null
  topP: number | null
  presencePenalty: number | null
  frequencyPenalty: number | null
  thinkingBudget: number | null

  // 高度な機能
  geminiEnableFunctionCalling: boolean
  functionCallingMode: 'auto' | 'any' | 'none'
  enabledFunctionTools: string[]
  geminiEnableGrounding: boolean

  // ダミープロンプト
  enableDummyUserPrompt: boolean
  dummyUserPrompt: string
  enableDummyModelPrompt: boolean
  dummyModelPrompt: string
  prependDummyModelToResponse: boolean

  // プロファイル画像
  profileImage?: string
}

/** 設定プロファイル */
export interface SettingsProfile {
  id: string
  name: string
  description?: string
  settings: SettingsProfileData
  isDefault?: boolean
  createdAt: number
  updatedAt: number
}

// ============================================================================
// 統合設定型
// ============================================================================

/** 全ての設定を統合した型 */
export interface AppSettings
  extends GeminiParameters,
    GeminiAdvancedSettings,
    ThoughtTranslationSettings,
    RetrySettings,
    ProofreadingSettings,
    SummarySettings,
    ThemeSettings,
    BackgroundImageSettings,
    NavigationSettings,
    AvatarSettings {
  /** Gemini API基本設定 */
  apiKey: string
  modelName: string
  streamingSpeed: number
  systemPrompt: string
  // 送信時のみ挿入するダミープロンプト設定
  enableDummyUserPrompt: boolean
  dummyUserPrompt: string
  enableDummyModelPrompt: boolean
  dummyModelPrompt: string
  // 保存時にモデル応答の先頭へダミーモデル文を連結
  prependDummyModelToResponse: boolean
  // プロファイル管理
  styleProfiles?: SettingsProfile[]
  currentProfileId?: string
}

/** 設定のデフォルト値 */
export const DEFAULT_SETTINGS: AppSettings = {
  // 開発時は環境変数から取得する
  apiKey: process.env.GEMINI_API_KEY || '',
  modelName: 'gemini-2.5-flash',
  streamingSpeed: 30,
  systemPrompt: '',

  // Gemini APIパラメータ
  maxTokens: null,
  temperature: null,
  topK: null,
  topP: null,
  presencePenalty: null,
  frequencyPenalty: null,
  thinkingBudget: null,

  // Gemini拡張機能
  streamingOutput: false,
  enableThinking: false,
  includeThoughts: false,

  // 思考プロセス翻訳
  enableThoughtTranslation: false,
  thoughtTranslationProvider: 'gemini',
  thoughtTranslationModel: 'gemini-2.0-flash-lite',
  deeplApiKey: '',
  geminiEnableFunctionCalling: true,
  enabledFunctionTools: [...defaultEnabledFunctionToolNames],
  functionCallingMode: 'auto' as const,
  geminiEnableGrounding: false,

  enableAutoRetry: false,
  maxRetries: 5,
  useFixedRetryDelay: false,
  fixedRetryDelaySeconds: 15,
  maxBackoffDelaySeconds: 60,

  // 校正機能
  enableProofreading: false,
  proofreadingModelName: 'gemini-2.5-flash',
  proofreadingSystemInstruction:
    'あなたはプロの編集者です。受け取った文章の過剰な読点を抑制し、日本語として違和感のない読点の使用量に校正してください。承知しました等の応答は行わず、校正後の文章のみ出力して下さい。読点の抑制以外の編集は禁止です。読点以外の文章には絶対に手を付けないで下さい。',

  // 要約機能
  enableSummary: false,
  summaryModelName: 'gemini-2.5-flash',
  summarySystemInstruction:
    'あなたはプロの編集者です。与えられた会話履歴を簡潔で分かりやすい300文字程度の要約にまとめてください。重要なポイントや決定事項などを明確に示してください。要約のみを出力し、余計な説明や補足は絶対に出力しないで下さい。',

  // テーマとスタイル
  themePreset: 'default',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  fontMode: 'preset' as const,
  systemFontName: '',
  selectedPreset: 'system',
  uploadedFont: null,
  messageFontSize: 16,
  functionCallFontSize: 14,
  thoughtFontSize: 13,
  messageBubbleRadius: 16,
  messageBubblePaddingX: 20,
  messageBubblePaddingY: 16,
  messageImageWidthPercent: null,
  messageImageJustify: 'start',
  userBubbleColor: '#eff6ff',
  assistantBubbleColor: '#ffffff',

  backgroundImageBlob: null,
  backgroundImageDataUrl: null,
  overlayColor: '#000000',
  overlayOpacity: 0.3,
  messageOpacity: 0.9,

  // ナビゲーション
  enterToSend: true,
  enableSwipeNavigation: false,
  hideSystemPromptInChat: false,

  // ダミープロンプト（送信時のみ適用）
  enableDummyUserPrompt: false,
  dummyUserPrompt: '',
  enableDummyModelPrompt: false,
  dummyModelPrompt: '',
  prependDummyModelToResponse: false,

  // アバター設定
  avatarEnabled: false,
  avatarSize: 32, // デフォルト32px
  defaultUserAvatar: {},
  defaultAssistantAvatar: {},

  // プロファイル管理
  styleProfiles: [],
  currentProfileId: 'default',
} as const

/** 設定値のバリデーション関数の型 */
export type SettingsValidator<T> = (value: T) => boolean

/** 設定値のバリデーションルール */
export interface SettingsValidation {
  streamingSpeed: SettingsValidator<number>
  maxTokens: SettingsValidator<number | null>
  temperature: SettingsValidator<number | null>
  topK: SettingsValidator<number | null>
  topP: SettingsValidator<number | null>
  presencePenalty: SettingsValidator<number | null>
  frequencyPenalty: SettingsValidator<number | null>
  thinkingBudget: SettingsValidator<number | null>
  maxRetries: SettingsValidator<number>
  fixedRetryDelaySeconds: SettingsValidator<number>
  maxBackoffDelaySeconds: SettingsValidator<number>
  overlayOpacity: SettingsValidator<number>
  messageOpacity: SettingsValidator<number>
}

/** 設定項目のメタデータ */
export interface SettingMeta {
  label: string
  description?: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'file' | 'color' | 'range'
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
  placeholder?: string
  validate?: (value: string | number | boolean) => boolean
  group: SettingGroup
}

export type SettingGroup = 'basic' | 'parameters' | 'advanced' | 'tools' | 'proofreading' | 'image' | 'other'
