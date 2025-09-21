/**
 * 環境別ログ管理システム
 * 開発時、テスト時、本番時で異なるログ出力を制御
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = {
  component?: string
  function?: string
  timestamp?: boolean
  number?: number
  [key: string]: unknown
}

interface LoggerConfig {
  level: LogLevel
  enableTimestamp: boolean
  enableContext: boolean
  maxContextDepth: number
}

class Logger {
  private config: LoggerConfig
  private environment: string

  constructor() {
    this.environment = process.env.NODE_ENV || 'development'
    this.config = this.getConfig()
  }

  getConfig(): LoggerConfig {
    const isDev = this.environment === 'development'
    const isTest = this.environment === 'test'

    return {
      level: isDev ? 'debug' : isTest ? 'warn' : 'info', // 開発: debug, テスト: warn, 本番: info
      enableTimestamp: isDev || isTest,
      enableContext: isDev,
      maxContextDepth: isDev ? 3 : 1,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.config.level)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const parts: string[] = []

    if (this.config.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }

    parts.push(`[${level.toUpperCase()}]`)

    if (context?.component) {
      parts.push(`[${context.component}]`)
    }

    if (context?.function) {
      parts.push(`[${context.function}]`)
    }

    parts.push(message)

    return parts.join(' ')
  }

  private formatContext(context?: LogContext): Record<string, unknown> | undefined {
    if (!this.config.enableContext || !context) return undefined

    const { component, function: func, timestamp, ...rest } = context
    return Object.keys(rest).length > 0 ? rest : undefined
  }

  private log(level: LogLevel, message: string, context?: LogContext, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, context)
    const contextData = this.formatContext(context)

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, ...(contextData ? [contextData] : []), ...args)
        break
      case 'info':
        console.info(formattedMessage, ...(contextData ? [contextData] : []), ...args)
        break
      case 'warn':
        console.warn(formattedMessage, ...(contextData ? [contextData] : []), ...args)
        break
      case 'error':
        console.error(formattedMessage, ...(contextData ? [contextData] : []), ...args)
        break
    }
  }

  /**
   * 開発時のみ出力されるデバッグログ
   */
  debug(message: string, context?: LogContext, ...args: unknown[]): void {
    this.log('debug', message, context, ...args)
  }

  /**
   * 全環境で出力される情報ログ
   */
  info(message: string, context?: LogContext, ...args: unknown[]): void {
    this.log('info', message, context, ...args)
  }

  /**
   * 警告ログ（全環境で出力）
   */
  warn(message: string, context?: LogContext, ...args: unknown[]): void {
    this.log('warn', message, context, ...args)
  }

  /**
   * エラーログ（全環境で出力）
   */
  error(message: string, context?: LogContext, ...args: unknown[]): void {
    this.log('error', message, context, ...args)
  }

  /**
   * 開発時のみの詳細ログ（オブジェクトの詳細表示）
   */
  devOnly(message: string, data?: unknown, context?: LogContext): void {
    if (this.environment === 'development') {
      this.debug(message, context)
      if (data !== undefined) {
        console.debug('Data:', data)
      }
    }
  }

  /**
   * テスト時のみのログ
   */
  testOnly(message: string, data?: unknown, context?: LogContext): void {
    if (this.environment === 'test') {
      this.info(message, context)
      if (data !== undefined) {
        console.info('Test Data:', data)
      }
    }
  }

  /**
   * パフォーマンス測定用ログ（開発時のみ）
   */
  performance(label: string, startTime: number, context?: LogContext): void {
    if (this.environment === 'development') {
      const duration = performance.now() - startTime
      this.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`, context)
    }
  }

  /**
   * グループ化されたログ（開発時のみ）
   */
  group(label: string, callback: () => void): void {
    if (this.environment === 'development') {
      console.group(label)
      callback()
      console.groupEnd()
    }
  }

  /**
   * 設定を更新（開発時のみ）
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    if (this.environment === 'development') {
      this.config = { ...this.config, ...newConfig }
    }
  }
}

// シングルトンインスタンス
export const logger = new Logger()

// 便利なエクスポート
export { Logger }
export default logger
