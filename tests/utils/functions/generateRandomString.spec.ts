import { Type } from '@google/genai'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { generateRandomString, generateRandomStringDeclaration } from '~/utils/functions/generateRandomString'

describe('generateRandomString', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    mock.clearAllMocks()
  })

  describe('正常系', () => {
    it('デフォルト設定でランダム文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 10,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(result.results[0]).toHaveLength(10)
        // デフォルトでは大文字、小文字、数字が含まれる
        expect(result.results[0]).toMatch(/[A-Z0-9]/i)
      }
    })

    it('指定した個数の文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5,
        stringCount: 3,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(3)
        result.results.forEach((str: string) => {
          expect(str).toHaveLength(5)
        })
      }
    })

    it('大文字のみの文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 8,
        useUppercase: true,
        useLowercase: false,
        useNumbers: false,
        useSymbols: false,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results[0]).toHaveLength(8)
        expect(result.results[0]).toMatch(/^[A-Z]+$/)
      }
    })

    it('小文字のみの文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 6,
        useUppercase: false,
        useLowercase: true,
        useNumbers: false,
        useSymbols: false,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results[0]).toHaveLength(6)
        expect(result.results[0]).toMatch(/^[a-z]+$/)
      }
    })

    it('数字のみの文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 4,
        useUppercase: false,
        useLowercase: false,
        useNumbers: true,
        useSymbols: false,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results[0]).toHaveLength(4)
        expect(result.results[0]).toMatch(/^\d+$/)
      }
    })

    it('記号を含む文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 10,
        useUppercase: false,
        useLowercase: false,
        useNumbers: false,
        useSymbols: true,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results[0]).toHaveLength(10)
        // 記号のみなので必ず記号が含まれる
        expect(result.results[0]).toMatch(/^[!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/)
      }
    })

    it('最大長の文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 128,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results[0]).toHaveLength(128)
      }
    })

    it('最大個数の文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5,
        stringCount: 100,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(100)
      }
    })

    it('1文字の文字列を生成できる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 1,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results[0]).toHaveLength(1)
      }
    })
  })

  describe('異常系', () => {
    it('stringLengthが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {}

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect('error' in result).toBe(true)
        if ('error' in result) {
          expect(result.error).toBe("引数 'stringLength' は1以上の整数である必要があります。")
        }
      }
    })

    it('stringLengthが0の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 0,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'stringLength' は1以上の整数である必要があります。")
      }
    })

    it('stringLengthが負の数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: -5,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'stringLength' は1以上の整数である必要があります。")
      }
    })

    it('stringLengthが小数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5.5,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'stringLength' は1以上の整数である必要があります。")
      }
    })

    it('stringLengthが129以上の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 129,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('一度に生成できる文字列の長さは128文字までです。')
      }
    })

    it('stringCountが0の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5,
        stringCount: 0,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'stringCount' は1以上の整数である必要があります。")
      }
    })

    it('stringCountが負の数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5,
        stringCount: -1,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'stringCount' は1以上の整数である必要があります。")
      }
    })

    it('stringCountが小数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5,
        stringCount: 2.5,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'stringCount' は1以上の整数である必要があります。")
      }
    })

    it('stringCountが101以上の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5,
        stringCount: 101,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('一度に生成できる個数は100個までです。')
      }
    })

    it('全ての文字セットが無効な場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        stringLength: 5,
        useUppercase: false,
        useLowercase: false,
        useNumbers: false,
        useSymbols: false,
      }

      const result = await generateRandomString(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('少なくとも1種類の文字セット（大文字、小文字、数字、記号）を有効にする必要があります。')
      }
    })
  })

  describe('ランダム性のテスト', () => {
    it('複数回実行して異なる結果が得られる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 50,
        stringCount: 1,
      }

      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await generateRandomString(args, mockContext)
        if ('success' in result) {
          results.push(result.results[0])
        }
      }

      // 50文字の文字列を10回生成すれば、少なくとも大部分は異なるはず
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThanOrEqual(8)
    })

    it('複数個生成した場合、それぞれが異なる', async () => {
      const args: FunctionCallArgs = {
        stringLength: 20,
        stringCount: 10,
      }

      const result = await generateRandomString(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(10)

        // 20文字の文字列を10個生成すれば、少なくとも大部分は異なるはず
        const uniqueResults = new Set(result.results)
        expect(uniqueResults.size).toBeGreaterThanOrEqual(8)
      }
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(generateRandomStringDeclaration.name).toBe('generateRandomString')
      expect(generateRandomStringDeclaration.description).toContain('ランダムな文字列を生成')
      expect(generateRandomStringDeclaration.parameters?.type).toBe(Type.OBJECT)
      expect(generateRandomStringDeclaration.parameters?.required).toContain('stringLength')
    })
  })
})
