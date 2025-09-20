import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageTimer, manageTimerDeclaration } from '~/utils/functions/timer'

describe('manageTimer', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('タイマーを開始できる', async () => {
      const args: FunctionCallArgs = {
        action: 'start',
        timerName: 'test-timer',
        durationMinutes: 5,
      }

      const result = await manageTimer(args, mockContext)

      expect(result.action).toBe('start')
      expect(result.timerName).toBe('test-timer')
      expect(result.status).toBe('開始しました')
      expect(result.duration).toBe(5)
    })

    it('開始したタイマーの状態を確認できる', async () => {
      // タイマーを開始
      await manageTimer(
        {
          action: 'start',
          timerName: 'test-timer',
          durationMinutes: 10,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'check',
        timerName: 'test-timer',
      }

      const result = await manageTimer(args, mockContext)

      expect(result.action).toBe('check')
      expect(result.timerName).toBe('test-timer')
      expect(result.status).toBe('実行中')
      expect(result.remainingTime).toBeGreaterThan(0)
      expect(result.remainingTime).toBeLessThanOrEqual(10)
      expect(result.duration).toBe(10)
    })

    it('タイマーを停止できる', async () => {
      // タイマーを開始
      await manageTimer(
        {
          action: 'start',
          timerName: 'test-timer',
          durationMinutes: 5,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'stop',
        timerName: 'test-timer',
      }

      const result = await manageTimer(args, mockContext)

      expect(result.action).toBe('stop')
      expect(result.timerName).toBe('test-timer')
      expect(result.status).toBe('停止しました')
    })

    it('複数のタイマーを同時に管理できる', async () => {
      // 複数のタイマーを開始
      await manageTimer(
        {
          action: 'start',
          timerName: 'timer1',
          durationMinutes: 5,
        },
        mockContext
      )

      await manageTimer(
        {
          action: 'start',
          timerName: 'timer2',
          durationMinutes: 10,
        },
        mockContext
      )

      // それぞれの状態を確認
      const result1 = await manageTimer(
        {
          action: 'check',
          timerName: 'timer1',
        },
        mockContext
      )

      const result2 = await manageTimer(
        {
          action: 'check',
          timerName: 'timer2',
        },
        mockContext
      )

      expect(result1.timerName).toBe('timer1')
      expect(result1.duration).toBe(5)
      expect(result2.timerName).toBe('timer2')
      expect(result2.duration).toBe(10)
    })

    it('短い期間のタイマーを開始できる', async () => {
      const args: FunctionCallArgs = {
        action: 'start',
        timerName: 'short-timer',
        durationMinutes: 0.1, // 6秒
      }

      const result = await manageTimer(args, mockContext)

      expect(result.action).toBe('start')
      expect(result.timerName).toBe('short-timer')
      expect(result.status).toBe('開始しました')
      expect(result.duration).toBe(0.1)
    })

    it('長い期間のタイマーを開始できる', async () => {
      const args: FunctionCallArgs = {
        action: 'start',
        timerName: 'long-timer',
        durationMinutes: 1440, // 24時間
      }

      const result = await manageTimer(args, mockContext)

      expect(result.action).toBe('start')
      expect(result.timerName).toBe('long-timer')
      expect(result.status).toBe('開始しました')
      expect(result.duration).toBe(1440)
    })
  })

  describe('異常系', () => {
    it('timerNameが未指定の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        action: 'start',
        durationMinutes: 5,
      }

      await expect(manageTimer(args, mockContext)).rejects.toThrow('タイマー名(timerName)は必須です。')
    })

    it('startアクションでdurationMinutesが0の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        action: 'start',
        timerName: 'test-timer',
        durationMinutes: 0,
      }

      await expect(manageTimer(args, mockContext)).rejects.toThrow('タイマーを開始するには、0より大きい分数(durationMinutes)が必要です。')
    })

    it('startアクションでdurationMinutesが負の数の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        action: 'start',
        timerName: 'test-timer',
        durationMinutes: -1,
      }

      await expect(manageTimer(args, mockContext)).rejects.toThrow('タイマーを開始するには、0より大きい分数(durationMinutes)が必要です。')
    })

    it('存在しないタイマーを確認しようとした場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        action: 'check',
        timerName: 'non-existent-timer',
      }

      await expect(manageTimer(args, mockContext)).rejects.toThrow('タイマー "non-existent-timer" が見つかりません。')
    })

    it('存在しないタイマーを停止しようとした場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        action: 'stop',
        timerName: 'non-existent-timer',
      }

      await expect(manageTimer(args, mockContext)).rejects.toThrow('タイマー "non-existent-timer" が見つかりません。')
    })

    it('無効なアクションを指定した場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        action: 'invalid_action',
        timerName: 'test-timer',
      }

      await expect(manageTimer(args, mockContext)).rejects.toThrow('無効なアクションです: invalid_action')
    })
  })

  describe('タイマーの状態管理', () => {
    it('停止したタイマーは確認できない', async () => {
      // タイマーを開始
      await manageTimer(
        {
          action: 'start',
          timerName: 'test-timer',
          durationMinutes: 5,
        },
        mockContext
      )

      // タイマーを停止
      await manageTimer(
        {
          action: 'stop',
          timerName: 'test-timer',
        },
        mockContext
      )

      // 停止したタイマーを確認しようとする
      await expect(
        manageTimer(
          {
            action: 'check',
            timerName: 'test-timer',
          },
          mockContext
        )
      ).rejects.toThrow('タイマー "test-timer" が見つかりません。')
    })

    it('停止したタイマーは再度停止できない', async () => {
      // タイマーを開始
      await manageTimer(
        {
          action: 'start',
          timerName: 'test-timer',
          durationMinutes: 5,
        },
        mockContext
      )

      // タイマーを停止
      await manageTimer(
        {
          action: 'stop',
          timerName: 'test-timer',
        },
        mockContext
      )

      // 停止したタイマーを再度停止しようとする
      await expect(
        manageTimer(
          {
            action: 'stop',
            timerName: 'test-timer',
          },
          mockContext
        )
      ).rejects.toThrow('タイマー "test-timer" が見つかりません。')
    })
  })

  describe('残り時間の計算', () => {
    it('残り時間が正しく計算される', async () => {
      // タイマーを開始
      await manageTimer(
        {
          action: 'start',
          timerName: 'test-timer',
          durationMinutes: 10,
        },
        mockContext
      )

      const result = await manageTimer(
        {
          action: 'check',
          timerName: 'test-timer',
        },
        mockContext
      )

      expect(result.remainingTime).toBeLessThanOrEqual(10)
      expect(result.remainingTime).toBeGreaterThan(0)
    })

    it('残り時間は分単位で切り上げられる', async () => {
      // 短いタイマーを開始
      await manageTimer(
        {
          action: 'start',
          timerName: 'test-timer',
          durationMinutes: 0.1, // 6秒
        },
        mockContext
      )

      const result = await manageTimer(
        {
          action: 'check',
          timerName: 'test-timer',
        },
        mockContext
      )

      expect(result.remainingTime).toBeGreaterThan(0)
      expect(Number.isInteger(result.remainingTime)).toBe(true)
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageTimerDeclaration.name).toBe('manageTimer')
      expect(manageTimerDeclaration.description).toContain('タイマーを管理')
      expect(manageTimerDeclaration.parameters?.type).toBe('OBJECT')
      expect(manageTimerDeclaration.parameters?.required).toContain('action')
      expect(manageTimerDeclaration.parameters?.required).toContain('timerName')
    })
  })
})
