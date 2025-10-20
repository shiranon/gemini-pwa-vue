/**
 * ダイスロール関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/lib/logger'
import { getRandomInt } from '~/function-calling/random'
import { isIntegerInRange } from '~/function-calling/validation'
import { LIMITS } from '~/constants/constants'

/**
 * ダイスロールを実行する関数
 *
 * Gemini AIのFunction Calling機能を通じて、ダイスロールを実行します。
 * 指定したダイス式に基づいて乱数を生成し、結果を返します。
 * 複数のダイス、補正値、合計値の計算に対応しています。
 *
 * @async
 * @function rollDice
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.expression - ダイスロールの式（必須）
 *   形式: "(個数)d(面数)[+(補正値)]"
 *   例: "1d6", "2d10+5", "3d20-2"
 *   - 個数: 1-100個まで
 *   - 面数: 1-1000面まで
 *   - 補正値: -10000から+10000まで
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<object>} ダイスロールの結果を含むオブジェクト
 *   - `expression`: 入力されたダイス式
 *   - `rolls`: 各ダイスの出目の配列
 *   - `sum`: ダイスの出目の合計（補正値除く）
 *   - `modifier`: 補正値の文字列表現（"なし" または "+5", "-2" など）
 *   - `total`: 最終的な合計値（ダイスの合計 + 補正値）
 *
 * @throws {Error} ダイス式が指定されていない場合
 * @throws {Error} 無効なダイス形式が指定された場合
 * @throws {Error} ダイスの個数が範囲外の場合（1-100個）
 * @throws {Error} ダイスの面数が範囲外の場合（1-1000面）
 * @throws {Error} 補正値が範囲外の場合（-10000から+10000）
 */
export async function rollDice(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<
  | {
      expression: string
      rolls: number[]
      sum: number
      modifier: string
      total: number
    }
  | {
      error: string
    }
> {
  logger.info(`[Function Calling] rollDiceが呼び出されました。コンテキスト:`, { component: 'rollDice' }, context)

  const expression = args.expression as string
  if (!expression) {
    const errorMsg = 'ダイス式が指定されていません。'
    logger.info(`[Function Calling] rollDice: ${errorMsg}`, { component: 'rollDice' })
    return { error: errorMsg }
  }

  const diceRegex = /^(?<count>\d+)d(?<sides>\d+)(?:(?<modifierOp>[+-])(?<modifierVal>\d+))?$/i
  const match = expression.trim().match(diceRegex)

  if (!match) {
    const errorMsg = '無効なダイス形式です。「(個数)d(面数)+(補正値)」の形式で指定してください。(例: 1d6, 2d10+5)'
    logger.info(`[Function Calling] rollDice: ${errorMsg}`, { component: 'rollDice' })
    return { error: errorMsg }
  }

  const { count, sides, modifierOp, modifierVal } = match.groups!
  const numCount = Number.parseInt(count!, 10)
  const numSides = Number.parseInt(sides!, 10)
  const numModifier = modifierVal ? Number.parseInt(modifierVal, 10) : 0
  const finalModifier = modifierOp === '-' ? -numModifier : numModifier

  if (!isIntegerInRange(numCount, 1, LIMITS.MAX_DICE_COUNT)) {
    return { error: `ダイスの個数は1個から${LIMITS.MAX_DICE_COUNT}個までです。` }
  }
  if (!isIntegerInRange(numSides, 1, LIMITS.MAX_DICE_SIDES)) {
    return { error: `ダイスの面数は1面から${LIMITS.MAX_DICE_SIDES}面までです。` }
  }
  if (Math.abs(finalModifier) > LIMITS.MAX_DICE_MODIFIER) {
    return { error: `補正値は${LIMITS.MAX_DICE_MODIFIER}までです。` }
  }

  try {
    const rolls: number[] = []
    let sum = 0
    for (let i = 0; i < numCount; i++) {
      const roll = getRandomInt(1, numSides)
      rolls.push(roll)
      sum += roll
    }

    let total = sum
    if (modifierOp === '+') {
      total += numModifier
    } else if (modifierOp === '-') {
      total -= numModifier
    }

    const result = {
      expression: expression,
      rolls: rolls,
      sum: sum,
      modifier: modifierOp ? `${modifierOp}${numModifier}` : 'なし',
      total: total,
    }

    logger.info(`[Function Calling] rollDice: 実行結果:`, result)
    return result
  } catch (error) {
    logger.info(`[Function Calling] rollDiceで予期せぬエラー:`, { component: 'rollDice' }, error)
    return { error: `ダイスロール中に予期せぬエラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * rollDice関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがrollDice関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} rollDiceDeclaration
 * @property {string} name - 関数名（"rollDice"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {string[]} parameters.required - 必須パラメータの配列
 *
 */
export const rollDiceDeclaration: FunctionDeclaration = {
  name: 'rollDice',
  description: 'ダイスロールを実行します。「(個数)d(面数)+(補正値)」の形式でダイス式を指定してください。例: 1d6, 2d10+5',
  parameters: {
    type: Type.OBJECT,
    properties: {
      expression: {
        type: Type.STRING,
        description: 'ダイスロールの式。「(個数)d(面数)+(補正値)」の形式。例: 1d6, 2d10+5',
      },
    },
    required: ['expression'],
  },
}
