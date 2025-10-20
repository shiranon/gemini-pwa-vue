import { Type } from '@google/genai'
import { beforeEach, describe, expect, it } from 'bun:test'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { getRandomInteger, getRandomIntegerDeclaration } from '~/function-calling/functions/getRandomInteger'

describe('getRandomInteger', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
  })

  describe('正常系', () => {
    it('指定した範囲内の整数を生成できる', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 10,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(result.results[0]).toBeGreaterThanOrEqual(1)
        expect(result.results[0]).toBeLessThanOrEqual(10)
        expect(Number.isInteger(result.results[0])).toBe(true)
      }
    })

    it('同じ値の範囲で生成できる', async () => {
      const args: FunctionCallArgs = {
        min: 5,
        max: 5,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(result.results[0]).toBe(5)
      }
    })

    it('負の数を含む範囲で生成できる', async () => {
      const args: FunctionCallArgs = {
        min: -10,
        max: -1,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(result.results[0]).toBeGreaterThanOrEqual(-10)
        expect(result.results[0]).toBeLessThanOrEqual(-1)
      }
    })

    it('正負混合の範囲で生成できる', async () => {
      const args: FunctionCallArgs = {
        min: -5,
        max: 5,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(result.results[0]).toBeGreaterThanOrEqual(-5)
        expect(result.results[0]).toBeLessThanOrEqual(5)
      }
    })

    it('指定した個数の乱数を生成できる', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 100,
        count: 5,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(5)
        result.results.forEach((num: number) => {
          expect(num).toBeGreaterThanOrEqual(1)
          expect(num).toBeLessThanOrEqual(100)
          expect(Number.isInteger(num)).toBe(true)
        })
      }
    })

    it('最大個数まで生成できる', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 10,
        count: 100,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(100)
      }
    })

    it('大きな数値の範囲で生成できる', async () => {
      const args: FunctionCallArgs = {
        min: 1000000,
        max: 2000000,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results[0]).toBeGreaterThanOrEqual(1000000)
        expect(result.results[0]).toBeLessThanOrEqual(2000000)
      }
    })
  })

  describe('異常系', () => {
    it('minが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        max: 10,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'min' と 'max' は整数である必要があります。")
      }
    })

    it('maxが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 1,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'min' と 'max' は整数である必要があります。")
      }
    })

    it('minが小数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 1.5,
        max: 10,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'min' と 'max' は整数である必要があります。")
      }
    })

    it('maxが小数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 10.5,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'min' と 'max' は整数である必要があります。")
      }
    })

    it('minがmaxより大きい場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 10,
        max: 1,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'min' は 'max' 以下である必要があります。")
      }
    })

    it('countが0の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 10,
        count: 0,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'count' は1以上の整数である必要があります。")
      }
    })

    it('countが負の数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 10,
        count: -1,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'count' は1以上の整数である必要があります。")
      }
    })

    it('countが小数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 10,
        count: 2.5,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'count' は1以上の整数である必要があります。")
      }
    })

    it('countが101以上の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 10,
        count: 101,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('一度に生成できる個数は100個までです。')
      }
    })
  })

  describe('ランダム性のテスト', () => {
    it('複数回実行して異なる結果が得られる', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 100,
      }

      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await getRandomInteger(args, mockContext)
        if ('success' in result) {
          results.push(result.results[0])
        }
      }

      // 全て異なる結果が得られることを確認（確率的に）
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })

    it('複数個生成した場合、それぞれが異なる', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 1000,
        count: 10,
      }

      const result = await getRandomInteger(args, mockContext)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(10)

        // 全て異なる結果が得られることを確認（確率的に）
        const uniqueResults = new Set(result.results)
        expect(uniqueResults.size).toBeGreaterThan(1)
      }
    })

    it('範囲内の全ての値が生成される可能性がある', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 3,
        count: 1,
      }

      const results = new Set()
      for (let i = 0; i < 100; i++) {
        const result = await getRandomInteger(args, mockContext)
        if ('success' in result) {
          results.add(result.results[0])
        }
      }

      // 範囲内の全ての値が生成されることを確認（確率的に）
      expect(results.has(1)).toBe(true)
      expect(results.has(2)).toBe(true)
      expect(results.has(3)).toBe(true)
    })
  })

  describe('境界値のテスト', () => {
    it('最小値が生成される', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 2,
      }

      let foundMin = false
      for (let i = 0; i < 100; i++) {
        const result = await getRandomInteger(args, mockContext)
        if ('success' in result && result.results[0] === 1) {
          foundMin = true
          break
        }
      }
      expect(foundMin).toBe(true)
    })

    it('最大値が生成される', async () => {
      const args: FunctionCallArgs = {
        min: 1,
        max: 2,
      }

      let foundMax = false
      for (let i = 0; i < 100; i++) {
        const result = await getRandomInteger(args, mockContext)
        if ('success' in result && result.results[0] === 2) {
          foundMax = true
          break
        }
      }
      expect(foundMax).toBe(true)
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(getRandomIntegerDeclaration.name).toBe('getRandomInteger')
      expect(getRandomIntegerDeclaration.description).toContain('ランダムな整数を生成')
      expect(getRandomIntegerDeclaration.parameters?.type).toBe(Type.OBJECT)
      expect(getRandomIntegerDeclaration.parameters?.required).toContain('min')
      expect(getRandomIntegerDeclaration.parameters?.required).toContain('max')
    })
  })
})
