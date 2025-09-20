import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

/**
 * 現在の日付と時刻をJST（日本標準時）で取得する関数
 *
 * Gemini AIのFunction Calling機能を通じて、現在の日付と時刻を
 * 日本標準時（JST）で取得します。年月日、曜日、時分秒、タイムゾーン情報を
 * 日本語形式で返します。
 *
 * @async
 * @function getCurrentDateTime
 * @param {FunctionCallArgs} args - Function Callingの引数（現在は使用されません）
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<{date: string, weekday: string, time: string, timezone: string}>}
 *   日付・時刻情報を含むオブジェクト
 *   - `date`: "YYYY年MM月DD日" 形式の日付文字列
 *   - `weekday`: 曜日（日本語）
 *   - `time`: "HH:MM:SS" 形式の時刻文字列（24時間表記）
 *   - `timezone`: タイムゾーン情報（"JST (UTC+9)"）
 *
 */
export async function getCurrentDateTime(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  date: string
  weekday: string
  time: string
  timezone: string
}> {
  console.log(`[Function Calling] getCurrentDateTimeが呼び出されました。コンテキスト:`, context)

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }

    const formatter = new Intl.DateTimeFormat('ja-JP', options)
    const parts = formatter.formatToParts(new Date())

    const year = parts.find((p) => p.type === 'year')?.value || ''
    const month = parts.find((p) => p.type === 'month')?.value || ''
    const day = parts.find((p) => p.type === 'day')?.value || ''
    const weekday = parts.find((p) => p.type === 'weekday')?.value || ''
    const hour = parts.find((p) => p.type === 'hour')?.value || ''
    const minute = parts.find((p) => p.type === 'minute')?.value || ''
    const second = parts.find((p) => p.type === 'second')?.value || ''

    const result = {
      date: `${year}年${month}月${day}日`,
      weekday: weekday,
      time: `${hour}:${minute}:${second}`,
      timezone: 'JST (UTC+9)',
    }

    console.log(`[Function Calling] getCurrentDateTime: 取得結果:`, result)
    return result
  } catch (error) {
    console.error(`[Function Calling] getCurrentDateTimeでエラーが発生しました:`, error)
    throw new Error(`時刻の取得中にエラーが発生しました: ${(error as Error).message}`)
  }
}

/**
 * getCurrentDateTime関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがgetCurrentDateTime関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} getCurrentDateTimeDeclaration
 * @property {string} name - 関数名（"getCurrentDateTime"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義（現在は空）
 *
 */
export const getCurrentDateTimeDeclaration: FunctionDeclaration = {
  name: 'getCurrentDateTime',
  description: '現在の日付と時刻をJST（日本標準時）で取得します。年月日、曜日、時分秒、タイムゾーン情報を返します。',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
}
