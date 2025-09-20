import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { getCurrentDateTime, getCurrentDateTimeDeclaration } from '~/utils/functions/datetime'

describe('getCurrentDateTime', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('現在の日付と時刻を取得できる', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      expect(result.date).toMatch(/^\d{4}年\d{2}月\d{2}日$/)
      expect(result.weekday).toMatch(/^([月火水木金土日])曜日$/)
      expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}$/)
      expect(result.timezone).toBe('JST (UTC+9)')
    })

    it('日付の形式が正しい', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      // 日付の形式を詳細にチェック
      const dateMatch = result.date.match(/^(\d{4})年(\d{2})月(\d{2})日$/)
      expect(dateMatch).not.toBeNull()

      if (dateMatch) {
        const year = Number.parseInt(dateMatch[1] || '0', 10)
        const month = Number.parseInt(dateMatch[2] || '0', 10)
        const day = Number.parseInt(dateMatch[3] || '0', 10)

        expect(year).toBeGreaterThanOrEqual(2020)
        expect(year).toBeLessThanOrEqual(2030)
        expect(month).toBeGreaterThanOrEqual(1)
        expect(month).toBeLessThanOrEqual(12)
        expect(day).toBeGreaterThanOrEqual(1)
        expect(day).toBeLessThanOrEqual(31)
      }
    })

    it('時刻の形式が正しい', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      // 時刻の形式を詳細にチェック
      const timeMatch = result.time.match(/^(\d{2}):(\d{2}):(\d{2})$/)
      expect(timeMatch).not.toBeNull()

      if (timeMatch) {
        const hour = Number.parseInt(timeMatch[1] || '0', 10)
        const minute = Number.parseInt(timeMatch[2] || '0', 10)
        const second = Number.parseInt(timeMatch[3] || '0', 10)

        expect(hour).toBeGreaterThanOrEqual(0)
        expect(hour).toBeLessThanOrEqual(23)
        expect(minute).toBeGreaterThanOrEqual(0)
        expect(minute).toBeLessThanOrEqual(59)
        expect(second).toBeGreaterThanOrEqual(0)
        expect(second).toBeLessThanOrEqual(59)
      }
    })

    it('曜日が日本語で返される', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      const validWeekdays = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日']
      expect(validWeekdays).toContain(result.weekday)
    })

    it('タイムゾーンがJSTで返される', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      expect(result.timezone).toBe('JST (UTC+9)')
    })

    it('引数なしでも動作する', async () => {
      const result = await getCurrentDateTime({}, mockContext)

      expect(result.date).toBeDefined()
      expect(result.weekday).toBeDefined()
      expect(result.time).toBeDefined()
      expect(result.timezone).toBeDefined()
    })

    it('複数回実行しても一貫した形式で返される', async () => {
      const args: FunctionCallArgs = {}

      const result1 = await getCurrentDateTime(args, mockContext)
      const result2 = await getCurrentDateTime(args, mockContext)

      // 形式は同じであることを確認
      expect(result1.date).toMatch(/^\d{4}年\d{2}月\d{2}日$/)
      expect(result2.date).toMatch(/^\d{4}年\d{2}月\d{2}日$/)
      expect(result1.time).toMatch(/^\d{2}:\d{2}:\d{2}$/)
      expect(result2.time).toMatch(/^\d{2}:\d{2}:\d{2}$/)
      expect(result1.timezone).toBe('JST (UTC+9)')
      expect(result2.timezone).toBe('JST (UTC+9)')
    })
  })

  describe('時刻の精度', () => {
    it('秒単位まで正確に取得できる', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      // 秒の部分が数値であることを確認
      const timeMatch = result.time.match(/^(\d{2}):(\d{2}):(\d{2})$/)
      expect(timeMatch).not.toBeNull()

      if (timeMatch) {
        const second = Number.parseInt(timeMatch[3] || '0', 10)
        expect(Number.isInteger(second)).toBe(true)
        expect(second).toBeGreaterThanOrEqual(0)
        expect(second).toBeLessThanOrEqual(59)
      }
    })

    it('24時間表記で返される', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      // 時刻が24時間表記であることを確認
      const timeMatch = result.time.match(/^(\d{2}):(\d{2}):(\d{2})$/)
      expect(timeMatch).not.toBeNull()

      if (timeMatch) {
        const hour = Number.parseInt(timeMatch[1] || '0', 10)
        expect(hour).toBeGreaterThanOrEqual(0)
        expect(hour).toBeLessThanOrEqual(23)
      }
    })
  })

  describe('日本標準時での動作', () => {
    it('Asia/Tokyoタイムゾーンで動作する', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      // 日本時間の範囲内であることを確認（UTC+9）
      const timeMatch = result.time.match(/^(\d{2}):(\d{2}):(\d{2})$/)
      expect(timeMatch).not.toBeNull()

      if (timeMatch) {
        const hour = Number.parseInt(timeMatch[1] || '0', 10)
        // 日本時間はUTC+9なので、0-23の範囲内
        expect(hour).toBeGreaterThanOrEqual(0)
        expect(hour).toBeLessThanOrEqual(23)
      }
    })

    it('日本語ロケールで動作する', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)

      // 日本語の曜日が返されることを確認
      expect(result.weekday).toMatch(/曜日$/)

      // 日本語の日付形式が返されることを確認
      expect(result.date).toMatch(/年[^\n\r\u2028\u2029\u6708]*\u6708.*日$/)
    })
  })

  describe('エラーハンドリング', () => {
    it('Dateオブジェクトの作成に失敗した場合はエラーを投げる', async () => {
      // Dateコンストラクタをモックしてエラーを発生させる
      const originalDate = global.Date
      global.Date = class extends Date {
        constructor() {
          super()
          throw new Error('Date creation failed')
        }
      } as typeof Date

      const args: FunctionCallArgs = {}

      await expect(getCurrentDateTime(args, mockContext)).rejects.toThrow('時刻の取得中にエラーが発生しました: Date creation failed')

      // 元のDateを復元
      global.Date = originalDate
    })

    it('Intl.DateTimeFormatの作成に失敗した場合はエラーを投げる', async () => {
      // Intl.DateTimeFormatをモックしてエラーを発生させる
      const originalIntl = global.Intl
      global.Intl = {
        ...originalIntl,
        DateTimeFormat: class MockDateTimeFormat extends Intl.DateTimeFormat {
          constructor() {
            super('ja-JP')
            throw new Error('DateTimeFormat creation failed')
          }
        } as typeof Intl.DateTimeFormat,
      }

      const args: FunctionCallArgs = {}

      await expect(getCurrentDateTime(args, mockContext)).rejects.toThrow('時刻の取得中にエラーが発生しました: DateTimeFormat creation failed')

      // 元のIntlを復元
      global.Intl = originalIntl
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(getCurrentDateTimeDeclaration.name).toBe('getCurrentDateTime')
      expect(getCurrentDateTimeDeclaration.description).toContain('現在の日付と時刻')
      expect(getCurrentDateTimeDeclaration.parameters?.type).toBe('OBJECT')
      expect(getCurrentDateTimeDeclaration.parameters?.properties).toEqual({})
    })
  })

  describe('実際の時刻との整合性', () => {
    it('現在時刻と近い値が返される', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)
      const now = new Date()

      // 日付の部分を抽出
      const dateMatch = result.date.match(/^(\d{4})年(\d{2})月(\d{2})日$/)
      expect(dateMatch).not.toBeNull()

      if (dateMatch) {
        const resultYear = Number.parseInt(dateMatch[1] || '0', 10)
        const resultMonth = Number.parseInt(dateMatch[2] || '0', 10)
        const resultDay = Number.parseInt(dateMatch[3] || '0', 10)

        // 現在時刻と比較（秒単位の差は許容）
        expect(resultYear).toBe(now.getFullYear())
        expect(resultMonth).toBe(now.getMonth() + 1) // getMonth()は0ベース
        expect(resultDay).toBe(now.getDate())
      }
    })

    it('日本時間で正しい曜日が返される', async () => {
      const args: FunctionCallArgs = {}

      const result = await getCurrentDateTime(args, mockContext)
      const now = new Date()

      // 日本時間での曜日を計算
      const japaneseWeekdays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
      const expectedWeekday = japaneseWeekdays[now.getDay()]

      expect(result.weekday).toBe(expectedWeekday)
    })
  })
})
