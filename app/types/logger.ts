/**
 * Logger関連の型定義
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  /** コンポーネント名 */
  component?: string
  /** 関数名 */
  function?: string
  /** タイムスタンプを表示するか */
  timestamp?: boolean
  /** 数値データ */
  number?: number
  /** その他のコンテキスト情報 */
  [key: string]: unknown
}

export interface LoggerConfig {
  /** ログレベル */
  level: LogLevel
  /** タイムスタンプを有効にするか */
  enableTimestamp: boolean
  /** コンテキスト情報を有効にするか */
  enableContext: boolean
  /** コンテキストの最大深度 */
  maxContextDepth: number
}

export interface LoggerInterface {
  debug(message: string, contextOrFirstArg?: LogContext | unknown, ...args: unknown[]): void
  info(message: string, contextOrFirstArg?: LogContext | unknown, ...args: unknown[]): void
  warn(message: string, contextOrFirstArg?: LogContext | unknown, ...args: unknown[]): void
  error(message: string, contextOrFirstArg?: LogContext | unknown, ...args: unknown[]): void
  devOnly(message: string, data?: unknown, context?: LogContext): void
  testOnly(message: string, data?: unknown, context?: LogContext): void
  performance(label: string, startTime: number, context?: LogContext): void
  group(label: string, callback: () => void): void
  getConfig(): LoggerConfig
  updateConfig(newConfig: Partial<LoggerConfig>): void
}

/**
 * ログレベル定数
 */
export const LOG_LEVELS = {
  DEBUG: 'debug' as const,
  INFO: 'info' as const,
  WARN: 'warn' as const,
  ERROR: 'error' as const,
} as const

/**
 * 環境定数
 */
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development' as const,
  TEST: 'test' as const,
  PRODUCTION: 'production' as const,
} as const
