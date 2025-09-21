import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'

/**
 * ゲーム内の経過日数を管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、ゲーム内の経過日数を管理します。
 * 日数の経過、現在の日数取得が可能です。永続メモリにゲーム日数を保存し、
 * セッション間で状態を維持します。
 *
 * @async
 * @function manageGameDate
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.action - 実行するアクション（"passDays" | "getCurrentDay"）
 * @param {number} [args.days] - "passDays"アクションで経過させる日数（デフォルト: 1）
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<{success: boolean, currentDay: number, message: string} | {error: string}>}
 *   操作結果を含むオブジェクト
 *   - `success`: 操作の成功フラグ
 *   - `currentDay`: 現在のゲーム日数
 *   - `message`: 操作結果のメッセージ
 *   - `error`: エラーが発生した場合のエラーメッセージ
 *
 */
export async function manageGameDate(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<
  | {
      success: boolean
      currentDay: number
      message: string
    }
  | {
      error: string
    }
> {
  logger.info(`[Function Calling] manageGameDateが呼び出されました。コンテキスト:`, { component: 'manageGameDate' }, context)

  const { action, days = 1 } = args

  if (!action) {
    return { error: "引数 'action' は必須です。" }
  }

  try {
    // 永続メモリの初期化
    if (!context.persistentMemory) {
      context.persistentMemory = {}
    }
    if (typeof context.persistentMemory.gameDay !== 'number') {
      context.persistentMemory.gameDay = 1
    }

    let currentDay = context.persistentMemory.gameDay as number
    let message: string

    switch (action) {
      case 'passDays': {
        if (typeof days !== 'number' || days < 1 || !Number.isInteger(days)) {
          return { error: '経過させる日数(days)は1以上の整数である必要があります。' }
        }
        currentDay += days
        context.persistentMemory.gameDay = currentDay
        message = `${days}日が経過し、${currentDay}日目になりました。`
        break
      }

      case 'getCurrentDay': {
        message = `現在は${currentDay}日目です。`
        const getResult = { success: true, currentDay, message }
        logger.info(`[Function Calling] 処理完了:`, getResult)
        return getResult
      }

      default:
        return { error: `無効なアクションです: ${action}` }
    }

    const result = { success: true, currentDay, message }
    logger.info(`[Function Calling] 処理完了:`, result)
    return result
  } catch (error) {
    logger.info(`[Function Calling] manageGameDateでエラーが発生しました:`, { component: 'manageGameDate' }, error)
    return { error: `内部エラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * manageGameDate関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageGameDate関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageGameDateDeclaration
 * @property {string} name - 関数名（"manageGameDate"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {object} parameters.properties.action - アクション指定
 * @property {object} parameters.properties.days - 経過日数指定
 * @property {string[]} parameters.required - 必須パラメータのリスト
 *
 */
export const manageGameDateDeclaration: FunctionDeclaration = {
  name: 'manageGameDate',
  description: 'ゲーム内の経過日数を管理します。日数の経過、現在の日数取得が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: '実行するアクション（"passDays": 日数を経過させる、"getCurrentDay": 現在の日数を取得する）',
        enum: ['passDays', 'getCurrentDay'],
      },
      days: {
        type: Type.NUMBER,
        description: '経過させる日数（passDaysアクション時のみ使用、デフォルト: 1）',
        minimum: 1,
      },
    },
    required: ['action'],
  },
}
