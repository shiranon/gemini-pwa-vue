/**
 * タイマー関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'

// タイマー管理用のシンプルな実装
const timers = new Map<string, { endTime: number; duration: number }>()

/**
 * タイマーを管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、タイマーの管理を行います。
 * タイマーの開始、状態確認、停止機能を提供します。アプリケーション内の
 * メモリ（Map）を使用してタイマー情報を保持し、複数のタイマーを
 * 同時に管理できます。
 *
 * @async
 * @function manageTimer
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.action - 実行するアクション（必須）
 *   - "start": タイマーを開始
 *   - "check": タイマーの状態を確認
 *   - "stop": タイマーを停止
 * @param {string} args.timerName - タイマーを識別するための一意の名前（必須）
 * @param {number} [args.durationMinutes] - タイマーの期間（分単位）
 *   actionが"start"の場合は必須。0より大きい値である必要があります
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<object>} 操作結果を含むオブジェクト
 *   - `action`: 実行されたアクション
 *   - `timerName`: タイマー名
 *   - `status`: タイマーの状態（"開始しました", "実行中", "終了", "停止しました"）
 *   - `remainingTime`: 残り時間（分単位、checkアクション時）
 *   - `duration`: タイマーの期間（分単位、start・checkアクション時）
 *
 * @throws {Error} 必須引数が不足している場合
 * @throws {Error} 無効なアクションが指定された場合
 * @throws {Error} タイマーが見つからない場合（check・stopアクション時）
 * @throws {Error} 無効な期間が指定された場合（startアクション時）
 */
export async function manageTimer(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<
  | {
      action: string
      timerName: string
      status: string
      remainingTime?: number
      duration?: number
    }
  | {
      error: string
    }
> {
  logger.info(`[Function Calling] manageTimerが呼び出されました。コンテキスト:`, { component: 'manageTimer' }, context)

  const action = args.action as string
  const timerName = args.timerName as string
  const durationMinutes = args.durationMinutes as number

  if (!timerName) {
    const errorMsg = 'タイマー名(timerName)は必須です。'
    logger.info(`[Function Calling] manageTimer: ${errorMsg}`, { component: 'manageTimer' })
    return { error: errorMsg }
  }

  try {
    switch (action) {
      case 'start': {
        if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
          return { error: 'タイマーを開始するには、0より大きい分数(durationMinutes)が必要です。' }
        }
        const endTime = Date.now() + durationMinutes * 60 * 1000
        timers.set(timerName, { endTime, duration: durationMinutes })
        logger.info(`[Function Calling] manageTimer: タイマー開始: ${timerName}, 期間: ${durationMinutes}分`)
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
          return { error: `タイマー "${timerName}" が見つかりません。` }
        }
        const remainingTime = Math.max(0, timer.endTime - Date.now())
        const remainingMinutes = Math.ceil(remainingTime / (60 * 1000))
        const status = remainingTime > 0 ? '実行中' : '終了'
        logger.info(`[Function Calling] manageTimer: タイマー確認: ${timerName}, 残り時間: ${remainingMinutes}分`)
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
          return { error: `タイマー "${timerName}" が見つかりません。` }
        }
        timers.delete(timerName)
        logger.info(`[Function Calling] manageTimer: タイマー停止: ${timerName}`, { component: 'manageTimer' })
        return {
          action: 'stop',
          timerName,
          status: '停止しました',
        }
      }

      default:
        return { error: `無効なアクションです: ${action}` }
    }
  } catch (error) {
    logger.info(`[Function Calling] manageTimerでエラーが発生しました:`, { component: 'manageTimer' }, error)
    return { error: `タイマー操作中にエラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * manageTimer関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageTimer関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageTimerDeclaration
 * @property {string} name - 関数名（"manageTimer"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {string[]} parameters.required - 必須パラメータの配列
 *
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
      timerName: {
        type: Type.STRING,
        description: 'タイマーを識別するための一意の名前',
      },
      durationMinutes: {
        type: Type.NUMBER,
        description: 'タイマーの期間（分単位）。startアクションで必須',
      },
    },
    required: ['action', 'timerName'],
  },
}
