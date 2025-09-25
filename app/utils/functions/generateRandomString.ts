import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'
import { getRandomString } from '~/utils/random'
import { isPositiveInteger, isIntegerInRange } from '~/utils/validation'
import { LIMITS, CHARSETS } from '~/constants/constants'

/**
 * 指定された条件でランダムな文字列を生成する関数
 *
 * Gemini AIのFunction Calling機能を通じて、指定された条件に基づいて
 * ランダムな文字列を生成します。文字の種類（大文字、小文字、数字、記号）、
 * 長さ、生成個数を指定できます。
 *
 * @async
 * @function generateRandomString
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<{success: boolean, results: string[]} | {error: string}>}
 *   生成結果を含むオブジェクト
 *   - `success`: 成功フラグ（boolean）
 *   - `results`: 生成された文字列の配列
 *   - `error`: エラーメッセージ（エラー時のみ）
 *
 */
export async function generateRandomString(args: FunctionCallArgs, context: FunctionExecutionContext): Promise<{ success: boolean; results: string[] } | { error: string }> {
  logger.info(`[Function Calling] generateRandomStringが呼び出されました。コンテキスト:`, { component: 'generateRandomString' }, context)

  const {
    stringLength,
    stringCount = 1,
    useUppercase = true,
    useLowercase = true,
    useNumbers = true,
    useSymbols = false,
  } = args as {
    stringLength: number
    stringCount?: number
    useUppercase?: boolean
    useLowercase?: boolean
    useNumbers?: boolean
    useSymbols?: boolean
  }

  if (!isPositiveInteger(stringLength)) {
    return { error: "引数 'stringLength' は1以上の整数である必要があります。" }
  }
  if (!isIntegerInRange(stringLength, 1, LIMITS.MAX_STRING_LENGTH)) {
    return { error: `一度に生成できる文字列の長さは${LIMITS.MAX_STRING_LENGTH}文字までです。` }
  }
  if (!isPositiveInteger(stringCount)) {
    return { error: "引数 'stringCount' は1以上の整数である必要があります。" }
  }
  if (!isIntegerInRange(stringCount, 1, LIMITS.MAX_STRING_COUNT)) {
    return { error: `一度に生成できる個数は${LIMITS.MAX_STRING_COUNT}個までです。` }
  }

  let charSet = ''
  if (useUppercase) charSet += CHARSETS.UPPERCASE
  if (useLowercase) charSet += CHARSETS.LOWERCASE
  if (useNumbers) charSet += CHARSETS.DIGITS
  if (useSymbols) charSet += CHARSETS.SYMBOLS

  if (charSet.length === 0) {
    return { error: '少なくとも1種類の文字セット（大文字、小文字、数字、記号）を有効にする必要があります。' }
  }

  try {
    const results = []
    for (let i = 0; i < stringCount; i++) {
      results.push(getRandomString(stringLength, charSet))
    }

    const result = { success: true, results: results }
    logger.info(`[Function Calling] generateRandomString: 生成結果:`, result)
    return result
  } catch (error) {
    logger.info(`[Function Calling] generateRandomStringでエラーが発生しました:`, { component: 'generateRandomString' }, error)
    return { error: `ランダム文字列生成中にエラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * generateRandomString関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがgenerateRandomString関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} generateRandomStringDeclaration
 * @property {string} name - 関数名（"generateRandomString"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {object} parameters.properties.stringLength - 生成する文字列の長さ
 * @property {object} parameters.properties.stringCount - 生成する文字列の個数（オプション）
 * @property {object} parameters.properties.useUppercase - 大文字英字を使用するか（オプション）
 * @property {object} parameters.properties.useLowercase - 小文字英字を使用するか（オプション）
 * @property {object} parameters.properties.useNumbers - 数字を使用するか（オプション）
 * @property {object} parameters.properties.useSymbols - 記号を使用するか（オプション）
 *
 */
export const generateRandomStringDeclaration: FunctionDeclaration = {
  name: 'generateRandomString',
  description: '指定された条件でランダムな文字列を生成します。文字の種類（大文字、小文字、数字、記号）、長さ、生成個数を指定できます。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      stringLength: {
        type: Type.INTEGER,
        description: '生成する文字列の長さ（1-128文字）',
        minimum: 1,
        maximum: 128,
      },
      stringCount: {
        type: Type.INTEGER,
        description: '生成する文字列の個数（デフォルト: 1、最大: 100）',
        minimum: 1,
        maximum: 100,
      },
      useUppercase: {
        type: Type.BOOLEAN,
        description: '大文字英字を使用するか（デフォルト: true）',
      },
      useLowercase: {
        type: Type.BOOLEAN,
        description: '小文字英字を使用するか（デフォルト: true）',
      },
      useNumbers: {
        type: Type.BOOLEAN,
        description: '数字を使用するか（デフォルト: true）',
      },
      useSymbols: {
        type: Type.BOOLEAN,
        description: '記号を使用するか（デフォルト: false）',
      },
    },
    required: ['stringLength'],
  },
}
