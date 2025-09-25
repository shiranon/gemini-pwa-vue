import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'
import { getRandomIndex } from '~/utils/random'
import { isNonEmptyArray, isPositiveInteger, isIntegerInRange } from '~/utils/validation'
import { LIMITS } from '~/constants/constants'

/**
 * 提供されたリストの中からランダムに項目を選択する関数
 *
 * Gemini AIのFunction Calling機能を通じて、指定された配列から
 * ランダムに項目を選択します。選択する個数も指定可能で、
 * 重複を許可して選択します。
 *
 * @async
 * @function getRandomChoice
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<{success: boolean, results: any[]} | {error: string}>}
 *   選択結果を含むオブジェクト
 *   - `success`: 成功フラグ（boolean）
 *   - `results`: 選択された項目の配列
 *   - `error`: エラーメッセージ（エラー時のみ）
 *
 */
export async function getRandomChoice(args: FunctionCallArgs, context: FunctionExecutionContext): Promise<{ success: boolean; results: unknown[] } | { error: string }> {
  logger.info(`[Function Calling] getRandomChoiceが呼び出されました。コンテキスト:`, { component: 'getRandomChoice' }, context)

  const { choiceList, choiceCount = 1 } = args as { choiceList: unknown[]; choiceCount?: number }

  if (!isNonEmptyArray(choiceList)) {
    return { error: "引数 'choiceList' は空でない配列である必要があります。" }
  }
  if (!isPositiveInteger(choiceCount)) {
    return { error: "引数 'choiceCount' は1以上の整数である必要があります。" }
  }
  if (!isIntegerInRange(choiceCount, 1, LIMITS.MAX_CHOICE_COUNT)) {
    return { error: `一度に選択できる個数は${LIMITS.MAX_CHOICE_COUNT}個までです。` }
  }

  try {
    const results = []
    for (let i = 0; i < choiceCount; i++) {
      const index = getRandomIndex(choiceList.length)
      results.push(choiceList[index])
    }

    const result = { success: true, results: results }
    logger.info(`[Function Calling] getRandomChoice: 取得結果:`, result)
    return result
  } catch (error) {
    logger.info(`[Function Calling] getRandomChoiceでエラーが発生しました:`, { component: 'getRandomChoice' }, error)
    return { error: `ランダム選択中にエラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * getRandomChoice関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがgetRandomChoice関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} getRandomChoiceDeclaration
 * @property {string} name - 関数名（"getRandomChoice"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {object} parameters.properties.choiceList - 選択肢となる配列
 * @property {object} parameters.properties.choiceCount - 選択する項目の個数（オプション）
 *
 */
export const getRandomChoiceDeclaration: FunctionDeclaration = {
  name: 'getRandomChoice',
  description: '提供されたリストの中からランダムに項目を選択します。選択する個数も指定可能で、重複を許可して選択します。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      choiceList: {
        type: Type.ARRAY,
        description: '選択肢となる配列',
        items: {
          type: Type.STRING,
        },
      },
      choiceCount: {
        type: Type.INTEGER,
        description: '選択する項目の個数（デフォルト: 1、最大: 100）',
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['choiceList'],
  },
}
