import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { LogContext, LogLevel } from '~/types/logger'
import { Logger } from '~/lib/logger'

describe('Logger', () => {
  let logger: Logger
  let originalEnv: string | undefined
  let consoleSpy: {
    debug: ReturnType<typeof mock>
    info: ReturnType<typeof mock>
    warn: ReturnType<typeof mock>
    error: ReturnType<typeof mock>
    group: ReturnType<typeof mock>
    groupEnd: ReturnType<typeof mock>
  }

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    // consoleメソッドをモック
    consoleSpy = {
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      group: mock(() => {}),
      groupEnd: mock(() => {}),
    }

    // 実際のconsoleオブジェクトをモックで置き換え
    Object.defineProperty(global, 'console', {
      value: consoleSpy,
      writable: true,
    })

    // 新しいLoggerインスタンスを作成
    logger = new Logger()

    // モックをクリア（Bunの正しい方法）
    consoleSpy.debug.mockClear()
    consoleSpy.info.mockClear()
    consoleSpy.warn.mockClear()
    consoleSpy.error.mockClear()
    consoleSpy.group.mockClear()
    consoleSpy.groupEnd.mockClear()
  })

  afterEach(() => {
    // 環境変数を復元
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv
    } else {
      delete process.env.NODE_ENV
    }

    // consoleオブジェクトを復元
    Object.defineProperty(global, 'console', {
      value: console,
      writable: true,
    })
  })

  describe('開発環境での動作', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      logger = new Logger()
    })

    it('debugログが出力される', () => {
      logger.debug('Debug message')

      expect(consoleSpy.debug).toHaveBeenCalledWith(expect.stringMatching(/\[DEBUG\].*Debug message/))
    })

    it('infoログが出力される', () => {
      logger.info('Info message')

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\].*Info message/))
    })

    it('warnログが出力される', () => {
      logger.warn('Warning message')

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringMatching(/\[WARN\].*Warning message/))
    })

    it('errorログが出力される', () => {
      logger.error('Error message')

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringMatching(/\[ERROR\].*Error message/))
    })

    it('devOnlyメソッドが動作する', () => {
      logger.devOnly('Dev only message', { test: 'data' })

      expect(consoleSpy.debug).toHaveBeenCalledWith(expect.stringMatching(/\[DEBUG\].*Dev only message/))
      expect(consoleSpy.debug).toHaveBeenCalledWith('Data:', { test: 'data' })
    })

    it('testOnlyメソッドは動作しない', () => {
      logger.testOnly('Test only message', { test: 'data' })

      expect(consoleSpy.info).not.toHaveBeenCalled()
    })

    it('performanceメソッドが動作する', () => {
      const startTime = performance.now()
      logger.performance('Test operation', startTime)

      expect(consoleSpy.debug).toHaveBeenCalledWith(expect.stringMatching(/\[DEBUG\].*Performance: Test operation took/))
    })

    it('groupメソッドが動作する', () => {
      const callback = mock()
      logger.group('Test group', callback)

      expect(consoleSpy.group).toHaveBeenCalledWith('Test group')
      expect(callback).toHaveBeenCalled()
      expect(consoleSpy.groupEnd).toHaveBeenCalled()
    })
  })

  describe('テスト環境での動作', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test'
      logger = new Logger()
    })

    it('debugログは出力されない', () => {
      logger.debug('Debug message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('infoログは出力されない', () => {
      logger.info('Info message')

      expect(consoleSpy.info).not.toHaveBeenCalled()
    })

    it('warnログが出力される', () => {
      logger.warn('Warning message')

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringMatching(/\[WARN\].*Warning message/))
    })

    it('errorログが出力される', () => {
      logger.error('Error message')

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringMatching(/\[ERROR\].*Error message/))
    })

    it('devOnlyメソッドは動作しない', () => {
      logger.devOnly('Dev only message', { test: 'data' })

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('testOnlyメソッドが動作する', () => {
      logger.testOnly('Test only message', { test: 'data' })

      expect(consoleSpy.info).toHaveBeenCalledTimes(1)
      expect(consoleSpy.info).toHaveBeenCalledWith('Test Data:', { test: 'data' })
    })

    it('performanceメソッドは動作しない', () => {
      const startTime = performance.now()
      logger.performance('Test operation', startTime)

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('groupメソッドは動作しない', () => {
      const callback = mock()
      logger.group('Test group', callback)

      expect(consoleSpy.group).not.toHaveBeenCalled()
      expect(callback).not.toHaveBeenCalled()
      expect(consoleSpy.groupEnd).not.toHaveBeenCalled()
    })
  })

  describe('本番環境での動作', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      logger = new Logger()
    })

    it('debugログは出力されない', () => {
      logger.debug('Debug message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('infoログが出力される', () => {
      logger.info('Info message')

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\].*Info message/))
    })

    it('warnログが出力される', () => {
      logger.warn('Warning message')

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringMatching(/\[WARN\].*Warning message/))
    })

    it('errorログが出力される', () => {
      logger.error('Error message')

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringMatching(/\[ERROR\].*Error message/))
    })

    it('devOnlyメソッドは動作しない', () => {
      logger.devOnly('Dev only message', { test: 'data' })

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('testOnlyメソッドは動作しない', () => {
      logger.testOnly('Test only message', { test: 'data' })

      expect(consoleSpy.info).not.toHaveBeenCalled()
    })

    it('performanceメソッドは動作しない', () => {
      const startTime = performance.now()
      logger.performance('Test operation', startTime)

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('groupメソッドは動作しない', () => {
      const callback = mock()
      logger.group('Test group', callback)

      expect(consoleSpy.group).not.toHaveBeenCalled()
      expect(callback).not.toHaveBeenCalled()
      expect(consoleSpy.groupEnd).not.toHaveBeenCalled()
    })
  })

  describe('コンテキスト情報', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      logger = new Logger()
    })

    it('コンポーネント名が表示される', () => {
      const context: LogContext = { component: 'TestComponent' }
      logger.info('Test message', context)

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[TestComponent\].*Test message/))
    })

    it('関数名が表示される', () => {
      const context: LogContext = { function: 'testFunction' }
      logger.info('Test message', context)

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[testFunction\].*Test message/))
    })

    it('コンポーネント名と関数名が両方表示される', () => {
      const context: LogContext = { component: 'TestComponent', function: 'testFunction' }
      logger.info('Test message', context)

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[TestComponent\].*\[testFunction\].*Test message/))
    })

    it('追加のコンテキスト情報が表示される', () => {
      const context: LogContext = {
        component: 'TestComponent',
        userId: 123,
        action: 'create',
      }
      logger.info('Test message', context)

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[TestComponent\].*Test message/), { userId: 123, action: 'create' })
    })
  })

  describe('タイムスタンプ', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      logger = new Logger()
    })

    it('タイムスタンプが表示される', () => {
      logger.info('Test message')

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\].*Test message/))
    })
  })

  describe('設定管理', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      logger = new Logger()
    })

    it('現在の設定を取得できる', () => {
      const config = logger.getConfig()

      expect(config.level).toBe('debug')
      expect(config.enableTimestamp).toBe(true)
      expect(config.enableContext).toBe(true)
      expect(config.maxContextDepth).toBe(3)
    })

    it('開発環境でのみ設定を更新できる', () => {
      logger.updateConfig({ level: 'warn' })

      logger.debug('Debug message')
      logger.warn('Warning message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('本番環境では設定を更新できない', () => {
      process.env.NODE_ENV = 'production'
      logger = new Logger()

      logger.updateConfig({ level: 'debug' })

      logger.debug('Debug message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })
  })

  describe('ログレベル制御', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      logger = new Logger()
    })

    it('ログレベルが正しく制御される', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']

      levels.forEach((level) => {
        logger.updateConfig({ level })

        // 現在のレベルより低いレベルのログは出力されない
        if (level === 'info') {
          logger.debug('Debug message')
          expect(consoleSpy.debug).not.toHaveBeenCalled()
        }
        if (level === 'warn') {
          logger.debug('Debug message')
          logger.info('Info message')
          expect(consoleSpy.debug).not.toHaveBeenCalled()
          expect(consoleSpy.info).not.toHaveBeenCalled()
        }
        if (level === 'error') {
          logger.debug('Debug message')
          logger.info('Info message')
          logger.warn('Warning message')
          expect(consoleSpy.debug).not.toHaveBeenCalled()
          expect(consoleSpy.info).not.toHaveBeenCalled()
          expect(consoleSpy.warn).not.toHaveBeenCalled()
        }

        // 現在のレベル以上のログは出力される
        if (level === 'debug') {
          logger.debug('Debug message')
          expect(consoleSpy.debug).toHaveBeenCalled()
        }
        if (level === 'info') {
          logger.info('Info message')
          expect(consoleSpy.info).toHaveBeenCalled()
        }
        if (level === 'warn') {
          logger.warn('Warning message')
          expect(consoleSpy.warn).toHaveBeenCalled()
        }
        if (level === 'error') {
          logger.error('Error message')
          expect(consoleSpy.error).toHaveBeenCalled()
        }

        // モックをクリア
        consoleSpy.debug.mockClear()
        consoleSpy.info.mockClear()
        consoleSpy.warn.mockClear()
        consoleSpy.error.mockClear()
        consoleSpy.group.mockClear()
        consoleSpy.groupEnd.mockClear()
      })
    })
  })

  describe('引数の処理', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      logger = new Logger()
    })

    it('追加の引数が正しく渡される', () => {
      const context: LogContext = { component: 'TestComponent' }
      logger.info('Test message', context, 'arg1', 'arg2', { data: 'test' })

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[TestComponent\].*Test message/), 'arg1', 'arg2', { data: 'test' })
    })

    it('コンテキストなしでも動作する', () => {
      logger.info('Test message', undefined, 'arg1', 'arg2')

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\].*Test message/), 'arg1', 'arg2')
    })
  })
})
