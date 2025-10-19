import { Type } from '@google/genai'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageGameDate, manageGameDateDeclaration } from '~/utils/functions/manageGameDate'

describe('manageGameDate', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    mock.clearAllMocks()
  })

  describe('正常系', () => {
    it('初期状態で現在の日数を取得できる', async () => {
      const args: FunctionCallArgs = {
        action: 'getCurrentDay',
      }

      const result = await manageGameDate(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(1)
        expect(result.message).toBe('現在は1日目です。')
      }
    })

    it('デフォルトで1日経過できる', async () => {
      const args: FunctionCallArgs = {
        action: 'passDays',
      }

      const result = await manageGameDate(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(2)
        expect(result.message).toBe('1日が経過し、2日目になりました。')
      }
    })

    it('指定した日数だけ経過できる', async () => {
      const args: FunctionCallArgs = {
        action: 'passDays',
        days: 5,
      }

      const result = await manageGameDate(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(6)
        expect(result.message).toBe('5日が経過し、6日目になりました。')
      }
    })

    it('複数回日数を経過できる', async () => {
      // 最初に3日経過
      await manageGameDate(
        {
          action: 'passDays',
          days: 3,
        },
        mockContext
      )

      // さらに2日経過
      const args: FunctionCallArgs = {
        action: 'passDays',
        days: 2,
      }

      const result = await manageGameDate(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(6)
        expect(result.message).toBe('2日が経過し、6日目になりました。')
      }
    })

    it('経過後に現在の日数を取得できる', async () => {
      // 5日経過
      await manageGameDate(
        {
          action: 'passDays',
          days: 5,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'getCurrentDay',
      }

      const result = await manageGameDate(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(6)
        expect(result.message).toBe('現在は6日目です。')
      }
    })

    it('大きな日数でも経過できる', async () => {
      const args: FunctionCallArgs = {
        action: 'passDays',
        days: 1000,
      }

      const result = await manageGameDate(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(1001)
        expect(result.message).toBe('1000日が経過し、1001日目になりました。')
      }
    })
  })

  describe('異常系', () => {
    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {}

      const result = await manageGameDate(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'action' は必須です。")
      }
    })

    it('passDaysアクションでdaysが0の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'passDays',
        days: 0,
      }

      const result = await manageGameDate(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('経過させる日数(days)は1以上の整数である必要があります。')
      }
    })

    it('passDaysアクションでdaysが負の数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'passDays',
        days: -1,
      }

      const result = await manageGameDate(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('経過させる日数(days)は1以上の整数である必要があります。')
      }
    })

    it('passDaysアクションでdaysが小数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'passDays',
        days: 1.5,
      }

      const result = await manageGameDate(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('経過させる日数(days)は1以上の整数である必要があります。')
      }
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'invalid_action',
      }

      const result = await manageGameDate(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('無効なアクションです: invalid_action')
      }
    })
  })

  describe('永続メモリの管理', () => {
    it('persistentMemoryが未初期化の場合は自動で初期化する', async () => {
      const contextWithoutMemory: FunctionExecutionContext = {
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        action: 'getCurrentDay',
      }

      const result = await manageGameDate(args, contextWithoutMemory)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(contextWithoutMemory.persistentMemory).toBeDefined()
        expect(contextWithoutMemory.persistentMemory!.gameDay).toBe(1)
      }
    })

    it('gameDayが未設定の場合は自動で1に初期化する', async () => {
      const contextWithPartialMemory: FunctionExecutionContext = {
        persistentMemory: {},
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        action: 'getCurrentDay',
      }

      const result = await manageGameDate(args, contextWithPartialMemory)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(1)
        expect(contextWithPartialMemory.persistentMemory!.gameDay).toBe(1)
      }
    })

    it('既存のgameDayを保持する', async () => {
      const contextWithExistingDay: FunctionExecutionContext = {
        persistentMemory: {
          gameDay: 10,
        },
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        action: 'getCurrentDay',
      }

      const result = await manageGameDate(args, contextWithExistingDay)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.currentDay).toBe(10)
        expect(contextWithExistingDay.persistentMemory!.gameDay).toBe(10)
      }
    })

    it('日数経過後に永続メモリが更新される', async () => {
      const args: FunctionCallArgs = {
        action: 'passDays',
        days: 7,
      }

      const result = await manageGameDate(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(mockContext.persistentMemory!.gameDay).toBe(8)
      }
    })
  })

  describe('セッション間での状態保持', () => {
    it('複数の操作で状態が正しく保持される', async () => {
      // 1日目から開始
      let result = await manageGameDate(
        {
          action: 'getCurrentDay',
        },
        mockContext
      )
      if ('success' in result) {
        expect(result.currentDay).toBe(1)
      }

      // 3日経過
      result = await manageGameDate(
        {
          action: 'passDays',
          days: 3,
        },
        mockContext
      )
      if ('success' in result) {
        expect(result.currentDay).toBe(4)
      }

      // さらに2日経過
      result = await manageGameDate(
        {
          action: 'passDays',
          days: 2,
        },
        mockContext
      )
      if ('success' in result) {
        expect(result.currentDay).toBe(6)
      }

      // 最終確認
      result = await manageGameDate(
        {
          action: 'getCurrentDay',
        },
        mockContext
      )
      if ('success' in result) {
        expect(result.currentDay).toBe(6)
      }
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageGameDateDeclaration.name).toBe('manageGameDate')
      expect(manageGameDateDeclaration.description).toContain('ゲーム内の経過日数')
      expect(manageGameDateDeclaration.parameters?.type).toBe(Type.OBJECT)
      expect(manageGameDateDeclaration.parameters?.required).toContain('action')
    })
  })
})
