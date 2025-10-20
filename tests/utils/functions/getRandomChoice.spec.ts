import { Type } from '@google/genai'
import { beforeEach, describe, expect, it } from 'bun:test'
import { fail } from 'node:assert'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { getRandomChoice, getRandomChoiceDeclaration } from '~/function-calling/functions/getRandomChoice'

describe('getRandomChoice', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
  })

  describe('正常系', () => {
    it('文字列配列から1つ選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['りんご', 'バナナ', 'オレンジ'],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(['りんご', 'バナナ', 'オレンジ']).toContain(result.results[0] as string)
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('数値配列から1つ選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: [1, 2, 3, 4, 5],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect([1, 2, 3, 4, 5]).toContain(result.results[0] as number)
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('オブジェクト配列から1つ選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: [
          { name: '太郎', age: 20 },
          { name: '花子', age: 25 },
          { name: '次郎', age: 30 },
        ],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(result.results[0]).toHaveProperty('name')
        expect(result.results[0]).toHaveProperty('age')
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('指定した個数だけ選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['A', 'B', 'C', 'D', 'E'],
        choiceCount: 3,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(3)
        result.results.forEach((choice) => {
          expect(['A', 'B', 'C', 'D', 'E']).toContain(choice as string)
        })
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('最大個数まで選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: Array.from({ length: 50 }, (_, i) => `item${i}`),
        choiceCount: 100,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(100)
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('1つの要素から選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['唯一の選択肢'],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(result.results[0]).toBe('唯一の選択肢')
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('同じ要素を複数回選択できる（重複許可）', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['A', 'B'],
        choiceCount: 4,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(4)
        result.results.forEach((choice) => {
          expect(['A', 'B']).toContain(choice as string)
        })
      } else {
        fail('Expected success result but got error result')
      }
    })
  })

  describe('異常系', () => {
    it('choiceListが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {}

      const result = await getRandomChoice(args, mockContext)

      if ('error' in result) {
        expect(result.error).toBe("引数 'choiceList' は空でない配列である必要があります。")
      } else {
        fail('Expected error result but got success result')
      }
    })

    it('choiceListが配列でない場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        choiceList: 'not an array' as unknown,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('error' in result) {
        expect(result.error).toBe("引数 'choiceList' は空でない配列である必要があります。")
      } else {
        fail('Expected error result but got success result')
      }
    })

    it('choiceListが空配列の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        choiceList: [],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('error' in result) {
        expect(result.error).toBe("引数 'choiceList' は空でない配列である必要があります。")
      } else {
        fail('Expected error result but got success result')
      }
    })

    it('choiceCountが0の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['A', 'B', 'C'],
        choiceCount: 0,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('error' in result) {
        if ('error' in result) {
          expect(result.error).toBe("引数 'choiceCount' は1以上の整数である必要があります。")
        } else {
          fail('Expected error result but got success result')
        }
      } else {
        fail('Expected error result but got success result')
      }
    })

    it('choiceCountが負の数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['A', 'B', 'C'],
        choiceCount: -1,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('error' in result) {
        expect(result.error).toBe("引数 'choiceCount' は1以上の整数である必要があります。")
      } else {
        fail('Expected error result but got success result')
      }
    })

    it('choiceCountが小数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['A', 'B', 'C'],
        choiceCount: 2.5,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('error' in result) {
        expect(result.error).toBe("引数 'choiceCount' は1以上の整数である必要があります。")
      } else {
        fail('Expected error result but got success result')
      }
    })

    it('choiceCountが101以上の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        choiceList: ['A', 'B', 'C'],
        choiceCount: 101,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('error' in result) {
        expect(result.error).toBe('一度に選択できる個数は100個までです。')
      } else {
        fail('Expected error result but got success result')
      }
    })
  })

  describe('ランダム性のテスト', () => {
    it('複数回実行して異なる結果が得られる', async () => {
      const args: FunctionCallArgs = {
        choiceList: Array.from({ length: 100 }, (_, i) => `option${i}`),
        choiceCount: 1,
      }

      const results = []
      for (let i = 0; i < 50; i++) {
        const result = await getRandomChoice(args, mockContext)
        if ('success' in result) {
          results.push(result.results[0])
        } else {
          fail('Expected success result but got error result')
        }
      }

      // 100個の選択肢から50回選ぶので、少なくとも30個以上は異なるはず
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThanOrEqual(30)
    })

    it('複数個選択した場合、それぞれがランダム', async () => {
      const args: FunctionCallArgs = {
        choiceList: Array.from({ length: 50 }, (_, i) => `item${i}`),
        choiceCount: 10,
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(10)

        // 50個から10個選ぶので、少なくとも大部分は異なるはず
        const uniqueResults = new Set(result.results)
        expect(uniqueResults.size).toBeGreaterThanOrEqual(7)
      } else {
        fail('Expected success result but got error result')
      }
    })
  })

  describe('様々なデータ型のテスト', () => {
    it('真偽値配列から選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: [true, false],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(typeof result.results[0]).toBe('boolean')
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('nullとundefinedを含む配列から選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: [null, undefined, 'value'],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
      } else {
        fail('Expected success result but got error result')
      }
    })

    it('ネストした配列から選択できる', async () => {
      const args: FunctionCallArgs = {
        choiceList: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      }

      const result = await getRandomChoice(args, mockContext)

      if ('success' in result) {
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
        expect(Array.isArray(result.results[0])).toBe(true)
      } else {
        fail('Expected success result but got error result')
      }
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(getRandomChoiceDeclaration.name).toBe('getRandomChoice')
      expect(getRandomChoiceDeclaration.description).toContain('ランダムに項目を選択')
      expect(getRandomChoiceDeclaration.parameters?.type).toBe(Type.OBJECT)
      expect(getRandomChoiceDeclaration.parameters?.required).toContain('choiceList')
    })
  })
})
