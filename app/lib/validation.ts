/**
 * バリデーション関数
 * 汎用性: 極高 - フォーム・アップロード全般で再利用可能
 * 設定値の検証からファイル・フォーム全般のバリデーションまで対応
 * VeeValidate + Zod統合対応
 */

import { z } from 'zod'

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface FileValidationOptions {
  maxSize?: number
  allowedTypes?: string[]
  maxFiles?: number
  minFiles?: number
}

/**
 * 数値の範囲調整（clamp）- Zodバリデーション後に使用
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 基本的な文字列バリデーション用スキーマ
 */
export const stringSchema = z.string().min(1, 'この項目は必須です').trim()

/**
 * 任意の文字列バリデーション用スキーマ
 */
export const optionalStringSchema = z.string().optional()

/**
 * 文字列長制限付きスキーマ
 */
export const stringLengthSchema = (min: number, max: number, fieldName = 'この項目') =>
  z.string().min(min, `${fieldName}は${min}文字以上で入力してください`).max(max, `${fieldName}は${max}文字以下で入力してください`).trim()

/**
 * URL バリデーション用スキーマ
 */
export const urlSchema = z.string().min(1, 'URLを入力してください').url('有効なURLを入力してください')

/**
 * プロトコル制限付きURLスキーマ
 */
export const protocolRestrictedUrlSchema = (allowedProtocols: string[] = ['http:', 'https:']) =>
  z
    .string()
    .min(1, 'URLを入力してください')
    .url('有効なURLを入力してください')
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url)
          return allowedProtocols.includes(urlObj.protocol)
        } catch {
          return false
        }
      },
      { message: `許可されていないプロトコルです。使用可能: ${allowedProtocols.join(', ')}` }
    )

/**
 * 数値範囲バリデーション用スキーマ
 */
export const numberRangeSchema = (min: number, max: number) => z.number({ message: '数値を入力してください' }).min(min, `${min}以上の値を入力してください`).max(max, `${max}以下の値を入力してください`)

/**
 * ファイルサイズバリデーション用スキーマ（MB単位）
 */
export const fileSizeSchema = (maxSizeMB: number) =>
  z.instanceof(File).refine((file) => file.size <= maxSizeMB * 1024 * 1024, {
    message: `ファイルサイズが上限（${maxSizeMB}MB）を超えています`,
  })

/**
 * ファイルタイプバリデーション用スキーマ
 */
export const fileTypeSchema = (allowedTypes: string[]) =>
  z.instanceof(File).refine(
    (file) => {
      if (allowedTypes.length === 0) return true
      return allowedTypes.some((allowed) => {
        if (allowed.endsWith('/*')) {
          const prefix = allowed.slice(0, -2)
          return file.type.startsWith(prefix)
        }
        return file.type === allowed
      })
    },
    {
      message: `許可されていないファイル形式です。対応形式: ${allowedTypes.join(', ')}`,
    }
  )

/**
 * ファイル数バリデーション用スキーマ
 */
export const fileCountSchema = (minFiles?: number, maxFiles?: number) => {
  let schema = z.array(z.instanceof(File))

  if (minFiles !== undefined) {
    schema = schema.min(minFiles, `ファイルを${minFiles}個以上選択してください`)
  }

  if (maxFiles !== undefined) {
    schema = schema.max(maxFiles, `ファイル数が上限（${maxFiles}個）を超えています`)
  }

  return schema
}

/**
 * 複合ファイルバリデーション用スキーマ
 */
export const fileValidationSchema = (options: FileValidationOptions) => {
  let schema = z.instanceof(File)

  if (options.maxSize) {
    schema = schema.refine((file) => file.size <= options.maxSize!, {
      message: `ファイルサイズが上限（${(options.maxSize! / (1024 * 1024)).toFixed(1)}MB）を超えています`,
    })
  }

  if (options.allowedTypes && options.allowedTypes.length > 0) {
    schema = schema.refine(
      (file) =>
        options.allowedTypes!.some((allowed) => {
          if (allowed.endsWith('/*')) {
            const prefix = allowed.slice(0, -2)
            return file.type.startsWith(prefix)
          }
          return file.type === allowed
        }),
      {
        message: `許可されていないファイル形式です。対応形式: ${options.allowedTypes!.join(', ')}`,
      }
    )
  }

  return schema
}

/**
 * 複合ファイル配列バリデーション用スキーマ
 */
export const fileArrayValidationSchema = (options: FileValidationOptions) => {
  let schema = z.array(fileValidationSchema(options))

  if (options.minFiles !== undefined) {
    schema = schema.min(options.minFiles, `ファイルを${options.minFiles}個以上選択してください`)
  }

  if (options.maxFiles !== undefined) {
    schema = schema.max(options.maxFiles, `ファイル数が上限（${options.maxFiles}個）を超えています`)
  }

  return schema
}

/**
 * API設定用スキーマ
 */
export const apiSettingsSchema = z.object({
  apiKey: stringLengthSchema(10, 1000, 'APIキー'),
  apiUrl: urlSchema,
  timeout: numberRangeSchema(1000, 30000),
  retryCount: numberRangeSchema(0, 5),
})

/**
 * チャット設定用スキーマ
 */
export const chatSettingsSchema = z.object({
  maxTokens: numberRangeSchema(100, 4096),
  temperature: numberRangeSchema(0, 2),
  systemPrompt: stringLengthSchema(0, 1000, 'システムプロンプト'),
  enableAutoSave: z.boolean(),
})

/**
 * ファイル設定用スキーマ
 */
export const fileSettingsSchema = z.object({
  maxFileSize: numberRangeSchema(1, 100), // MB
  allowedFileTypes: z.array(z.string()).min(1, '少なくとも1つのファイル形式を選択してください'),
  autoBackup: z.boolean(),
})

/**
 * インポートオプション用スキーマ
 */
export const importOptionsSchema = z.object({
  importChats: z.boolean(),
  importSettings: z.boolean(),
  replaceExisting: z.boolean(),
})

/**
 * エクスポートオプション用スキーマ
 */
export const exportOptionsSchema = z.object({
  exportChats: z.boolean().default(true),
  exportSettings: z.boolean().default(true),
  compressionLevel: numberRangeSchema(0, 9).default(6),
})

// 型エクスポート
export type ApiSettingsFormData = z.infer<typeof apiSettingsSchema>
export type ChatSettingsFormData = z.infer<typeof chatSettingsSchema>
export type FileSettingsFormData = z.infer<typeof fileSettingsSchema>
export type ImportOptionsFormData = z.infer<typeof importOptionsSchema>
export type ExportOptionsFormData = z.infer<typeof exportOptionsSchema>

/**
 * Zodスキーマを使用したバリデーション実行
 */
export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err) => err.message),
      }
    }
    return { success: false, errors: ['バリデーションエラーが発生しました'] }
  }
}

/**
 * Zodスキーマを使用したsafeバリデーション実行
 */
export function safeValidateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return {
      success: false,
      errors: result.error.issues.map((err) => err.message),
    }
  }
}

/** 設定フォーム用のバリデーションスキーマ */
export const settingsFormSchema = z.object({
  // API設定
  apiKey: z.string().min(1, 'APIキーは必須です').optional(),
  modelName: z.string().min(1, 'モデル名を選択してください').optional(),
  systemPrompt: z.string().optional(),

  // パフォーマンス設定
  temperature: z.number().min(0).max(2).optional().or(z.literal(null)),
  maxTokens: z.number().min(1).max(32768).optional().or(z.literal(null)),
  topK: z.number().min(1).max(40).optional().or(z.literal(null)),
  topP: z.number().min(0).max(1).optional().or(z.literal(null)),

  // 高度な設定
  streamingSpeed: z.number().min(10).max(200).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  enabledFunctionTools: z.array(z.string()).optional(),

  // UI設定
  fontFamily: z.string().optional(),
  messageFontSize: z.number().min(10).max(36).optional(),
  functionCallFontSize: z.number().min(8).max(28).optional(),
  thoughtFontSize: z.number().min(8).max(28).optional(),
  messageBubbleRadius: z.number().min(0).max(40).optional(),
  messageBubblePaddingX: z.number().min(4).max(48).optional(),
  messageBubblePaddingY: z.number().min(4).max(48).optional(),
  messageImageWidthPercent: z.number().min(10).max(100).optional().or(z.literal(null)),
  userBubbleColor: z.string().optional(),
  assistantBubbleColor: z.string().optional(),
  themePreset: z.enum(['default', 'midnight', 'forest', 'rose', 'noir']).optional(),
  enterToSend: z.boolean().optional(),
  enableSwipeNavigation: z.boolean().optional(),
  hideSystemPromptInChat: z.boolean().optional(),
})

export type SettingsFormData = z.infer<typeof settingsFormSchema>
