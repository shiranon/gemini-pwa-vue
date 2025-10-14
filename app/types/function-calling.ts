/**
 * Function Calling 関連の型定義
 */

// @google/genai の型定義を再エクスポート
import type { FunctionDeclaration as GoogleFunctionDeclaration, Schema } from '@google/genai'

/**
 * Google Gemini API の FunctionDeclaration を使用
 */
export type FunctionDeclaration = GoogleFunctionDeclaration

/**
 * Google Gemini API の Schema を使用
 */
export type FunctionParameterSchema = Schema

/**
 * Function Calling の設定
 */
export interface FunctionCallingSettings {
  enabled: boolean
  mode: 'auto' | 'any' | 'none'
  allowedFunctionNames?: string[]
  availableFunctions: FunctionDeclaration[]
}

/**
 * 関数呼び出しの引数
 */
export interface FunctionCallArgs {
  [key: string]: unknown
}

/**
 * 関数呼び出しリクエスト
 */
export interface FunctionCall {
  name: string
  args: FunctionCallArgs
}

/**
 * 関数実行結果
 */
export interface FunctionCallResult {
  name: string
  args: FunctionCallArgs
  result: unknown
  error?: string
  executionTime?: number
  context?: FunctionExecutionContext
}

/**
 * 関数実行コンテキスト
 */
export interface FunctionExecutionContext {
  messageId?: string
  timestamp: number
  userId?: string
  persistentMemory?: Record<string, unknown>
}

/**
 * Function Calling用のツールメタデータ
 */
export interface FunctionToolMeta {
  displayName: string
  id?: string
  description?: string
  category?: string
  tags?: string[]
  defaultEnabled?: boolean
  docsUrl?: string
  argsHint?: string
  contextHint?: string
}

/**
 * Function Callingに渡す引数整形・検証関数の型
 */
export type FunctionArgsPreparer = (rawArgs: FunctionCallArgs) => FunctionCallArgs | Promise<FunctionCallArgs>
export type FunctionArgsValidator = (args: FunctionCallArgs) => void
export type FunctionExecutionContextEnhancer = (context: FunctionExecutionContext) => FunctionExecutionContext

/**
 * Function Callingレジストリ用のツール定義
 */
export interface FunctionToolDefinition {
  declaration: FunctionDeclaration
  handler: FunctionHandler
  meta?: FunctionToolMeta
  prepareArgs?: FunctionArgsPreparer
  validateArgs?: FunctionArgsValidator
  enhanceExecutionContext?: FunctionExecutionContextEnhancer
}

/**
 * 関数実行ハンドラーの型
 */
export type FunctionHandler = (args: FunctionCallArgs, context: FunctionExecutionContext) => Promise<unknown>

/**
 * 関数レジストリのエントリ
 */
export interface FunctionRegistryEntry {
  declaration: FunctionDeclaration
  handler: FunctionHandler
  enabled: boolean
  meta?: FunctionToolMeta
  prepareArgs?: FunctionArgsPreparer
  validateArgs?: FunctionArgsValidator
  enhanceExecutionContext?: FunctionExecutionContextEnhancer
}

/**
 * 関数実行ログ
 */
export interface FunctionExecutionLog {
  id: string
  functionName: string
  args: FunctionCallArgs
  result: unknown
  error?: string
  timestamp: number
  executionTime: number
  context: FunctionExecutionContext
}
