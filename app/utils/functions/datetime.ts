/**
 * 日付・時刻関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

/**
 * 現在の日付と時刻をJST（日本標準時）で取得する関数
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
 * getCurrentDateTime関数の宣言
 */
export const getCurrentDateTimeDeclaration: FunctionDeclaration = {
  name: 'getCurrentDateTime',
  description: '現在の日付と時刻をJST（日本標準時）で取得します。年月日、曜日、時分秒、タイムゾーン情報を返します。',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
}
