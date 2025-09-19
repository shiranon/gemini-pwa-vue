/**
 * ダイスロール関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

/**
 * ダイスロールを実行する関数
 * @param args 引数
 * @param context コンテキスト
 * @returns ダイスロールの結果
 */
export async function rollDice(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  expression: string
  rolls: number[]
  sum: number
  modifier: string
  total: number
}> {
  console.log(`[Function Calling] rollDiceが呼び出されました。コンテキスト:`, context)

  const expression = args.expression as string
  if (!expression) {
    const errorMsg = 'ダイス式が指定されていません。'
    console.error(`[Function Calling] rollDice: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const diceRegex = /^(?<count>\d+)d(?<sides>\d+)(?:(?<modifier_op>[+-])(?<modifier_val>\d+))?$/i
  const match = expression.trim().match(diceRegex)

  if (!match) {
    const errorMsg = '無効なダイス形式です。「(個数)d(面数)+(補正値)」の形式で指定してください。(例: 1d6, 2d10+5)'
    console.error(`[Function Calling] rollDice: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const { count, sides, modifier_op, modifier_val } = match.groups!
  const numCount = Number.parseInt(count!, 10)
  const numSides = Number.parseInt(sides!, 10)
  const numModifier = modifier_val ? Number.parseInt(modifier_val, 10) : 0

  if (numCount < 1 || numCount > 100) {
    throw new Error('ダイスの個数は1個から100個までです。')
  }
  if (numSides < 1 || numSides > 1000) {
    throw new Error('ダイスの面数は1面から1000面までです。')
  }
  if (numModifier > 10000) {
    throw new Error('補正値は10000までです。')
  }

  try {
    const rolls: number[] = []
    let sum = 0
    for (let i = 0; i < numCount; i++) {
      const roll = Math.floor(Math.random() * numSides) + 1
      rolls.push(roll)
      sum += roll
    }

    let total = sum
    if (modifier_op === '+') {
      total += numModifier
    } else if (modifier_op === '-') {
      total -= numModifier
    }

    const result = {
      expression: expression,
      rolls: rolls,
      sum: sum,
      modifier: modifier_op ? `${modifier_op}${numModifier}` : 'なし',
      total: total,
    }

    console.log(`[Function Calling] rollDice: 実行結果:`, result)
    return result
  } catch (error) {
    console.error(`[Function Calling] rollDiceで予期せぬエラー:`, error)
    throw new Error(`ダイスロール中に予期せぬエラーが発生しました: ${(error as Error).message}`)
  }
}

/**
 * rollDice関数の宣言
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
