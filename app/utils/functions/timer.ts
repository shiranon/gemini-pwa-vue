/**
 * タイマー関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

// タイマー管理用のシンプルな実装
const timers = new Map<string, { endTime: number; duration: number }>()

/**
 * タイマーを管理する関数
 */
export async function manageTimer(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  action: string
  timerName: string
  status: string
  remainingTime?: number
  duration?: number
}> {
  console.log(`[Function Calling] manageTimerが呼び出されました。コンテキスト:`, context)

  const action = args.action as string
  const timerName = args.timer_name as string
  const durationMinutes = args.duration_minutes as number

  if (!timerName) {
    const errorMsg = 'タイマー名(timer_name)は必須です。'
    console.error(`[Function Calling] manageTimer: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  try {
    switch (action) {
      case 'start': {
        if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
          throw new Error('タイマーを開始するには、0より大きい分数(duration_minutes)が必要です。')
        }
        const endTime = Date.now() + durationMinutes * 60 * 1000
        timers.set(timerName, { endTime, duration: durationMinutes })
        console.log(`[Function Calling] manageTimer: タイマー開始: ${timerName}, 期間: ${durationMinutes}分`)
        return {
          action: 'start',
          timerName,
          status: '開始しました',
          duration: durationMinutes,
        }
      }

      case 'check': {
        const timer = timers.get(timerName)
        if (!timer) {
          throw new Error(`タイマー "${timerName}" が見つかりません。`)
        }
        const remainingTime = Math.max(0, timer.endTime - Date.now())
        const remainingMinutes = Math.ceil(remainingTime / (60 * 1000))
        const status = remainingTime > 0 ? '実行中' : '終了'
        console.log(`[Function Calling] manageTimer: タイマー確認: ${timerName}, 残り時間: ${remainingMinutes}分`)
        return {
          action: 'check',
          timerName,
          status,
          remainingTime: remainingMinutes,
          duration: timer.duration,
        }
      }

      case 'stop': {
        if (!timers.has(timerName)) {
          throw new Error(`タイマー "${timerName}" が見つかりません。`)
        }
        timers.delete(timerName)
        console.log(`[Function Calling] manageTimer: タイマー停止: ${timerName}`)
        return {
          action: 'stop',
          timerName,
          status: '停止しました',
        }
      }

      default:
        throw new Error(`無効なアクションです: ${action}`)
    }
  } catch (error) {
    console.error(`[Function Calling] manageTimerでエラーが発生しました:`, error)
    throw new Error(`タイマー操作中にエラーが発生しました: ${(error as Error).message}`)
  }
}

/**
 * manageTimer関数の宣言
 */
export const manageTimerDeclaration: FunctionDeclaration = {
  name: 'manageTimer',
  description: 'タイマーを管理します。開始、確認、停止の操作が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: '実行するアクション。「start」でタイマー開始、「check」で状態確認、「stop」で停止',
        enum: ['start', 'check', 'stop'],
      },
      timer_name: {
        type: Type.STRING,
        description: 'タイマーを識別するための一意の名前',
      },
      duration_minutes: {
        type: Type.NUMBER,
        description: 'タイマーの期間（分単位）。startアクションで必須',
      },
    },
    required: ['action', 'timer_name'],
  },
}
