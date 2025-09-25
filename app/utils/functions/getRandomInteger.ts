import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'
import { getRandomInt } from '~/utils/random'
import { isInteger, isPositiveInteger, isIntegerInRange } from '~/utils/validation'
import { LIMITS } from '~/constants/constants'

/**
 * 指定された範囲内のランダムな整数を生成する関数
 *
 * Gemini AIのFunction Calling機能を通じて、指定された範囲内のランダムな整数を
 * 生成します。最小値、最大値、生成個数を指定でき、複数の乱数を一度に生成することも
 * 可能です。ゲームやシミュレーションで使用される乱数生成機能を提供します。
 *
 * @async
 * @function getRandomInteger
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {number} args.min - 乱数の最小値（整数）
 * @param {number} args.max - 乱数の最大値（整数）
 * @param {number} [args.count] - 生成する乱数の個数（デフォルト: 1、最大: 100）
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<{success: boolean, results: number[]} | {error: string}>}
 *   生成結果を含むオブジェクト
 *   - `success`: 操作の成功フラグ
 *   - `results`: 生成された乱数の配列
 *   - `error`: エラーが発生した場合のエラーメッセージ
 *
 */
export async function getRandomInteger(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<
  | {
      success: boolean
      results: number[]
    }
  | {
      error: string
    }
> {
  logger.info(`[Function Calling] getRandomIntegerが呼び出されました。コンテキスト:`, { component: 'getRandomInteger' }, context)

  const { min, max, count = 1 } = args

  // 引数の検証
  if (!isInteger(min) || !isInteger(max)) {
    return { error: "引数 'min' と 'max' は整数である必要があります。" }
  }
  if (min > max) {
    return { error: "引数 'min' は 'max' 以下である必要があります。" }
  }
  if (!isPositiveInteger(count)) {
    return { error: "引数 'count' は1以上の整数である必要があります。" }
  }
  if (!isIntegerInRange(count, 1, LIMITS.MAX_INTEGER_COUNT)) {
    return { error: `一度に生成できる個数は${LIMITS.MAX_INTEGER_COUNT}個までです。` }
  }

  try {
    const results: number[] = []
    for (let i = 0; i < count; i++) {
      results.push(getRandomInt(min, max))
    }

    const result = { success: true, results }
    logger.info(`[Function Calling] 処理完了:`, result)
    return result
  } catch (error) {
    logger.info(`[Function Calling] getRandomIntegerでエラーが発生しました:`, { component: 'getRandomInteger' }, error)
    return { error: `内部エラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * getRandomInteger関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがgetRandomInteger関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} getRandomIntegerDeclaration
 * @property {string} name - 関数名（"getRandomInteger"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {object} parameters.properties.min - 最小値指定
 * @property {object} parameters.properties.max - 最大値指定
 * @property {object} parameters.properties.count - 生成個数指定
 * @property {string[]} parameters.required - 必須パラメータのリスト
 *
 */
export const getRandomIntegerDeclaration: FunctionDeclaration = {
  name: 'getRandomInteger',
  description: '指定された範囲内のランダムな整数を生成します。最小値、最大値、生成個数を指定できます。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      min: {
        type: Type.NUMBER,
        description: '乱数の最小値（整数）',
      },
      max: {
        type: Type.NUMBER,
        description: '乱数の最大値（整数）',
      },
      count: {
        type: Type.NUMBER,
        description: '生成する乱数の個数（デフォルト: 1、最大: 100）',
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['min', 'max'],
  },
}
