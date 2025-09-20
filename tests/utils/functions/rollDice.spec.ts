import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { rollDice, rollDiceDeclaration } from '~/utils/functions/rollDice'

describe('rollDice', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('基本的なダイスロール（1d6）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d6',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('1d6')
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls![0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls![0]).toBeLessThanOrEqual(6)
      expect(result.sum).toBe(result.rolls![0])
      expect(result.modifier).toBe('なし')
      expect(result.total).toBe(result.sum)
    })

    it('複数ダイスロール（3d6）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '3d6',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('3d6')
      expect(result.rolls).toHaveLength(3)
      result.rolls!.forEach((roll) => {
        expect(roll).toBeGreaterThanOrEqual(1)
        expect(roll).toBeLessThanOrEqual(6)
      })
      expect(result.sum).toBe(result.rolls!.reduce((a, b) => a + b, 0))
      expect(result.modifier).toBe('なし')
      expect(result.total).toBe(result.sum)
    })

    it('正の補正値付きダイスロール（2d10+5）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '2d10+5',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('2d10+5')
      expect(result.rolls).toHaveLength(2)
      result.rolls!.forEach((roll) => {
        expect(roll).toBeGreaterThanOrEqual(1)
        expect(roll).toBeLessThanOrEqual(10)
      })
      expect(result.sum).toBe(result.rolls!.reduce((a, b) => a + b, 0))
      expect(result.modifier).toBe('+5')
      expect(result.total).toBe(result.sum + 5)
    })

    it('負の補正値付きダイスロール（1d20-2）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d20-2',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('1d20-2')
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls![0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls![0]).toBeLessThanOrEqual(20)
      expect(result.sum).toBe(result.rolls![0])
      expect(result.modifier).toBe('-2')
      expect(result.total).toBe(result.sum - 2)
    })

    it('大きなダイス（1d100）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d100',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('1d100')
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls![0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls![0]).toBeLessThanOrEqual(100)
    })

    it('最大個数のダイス（100d6）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '100d6',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('100d6')
      expect(result.rolls).toHaveLength(100)
      result.rolls!.forEach((roll) => {
        expect(roll).toBeGreaterThanOrEqual(1)
        expect(roll).toBeLessThanOrEqual(6)
      })
    })

    it('最大面数のダイス（1d1000）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d1000',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('1d1000')
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls![0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls![0]).toBeLessThanOrEqual(1000)
    })

    it('大きな補正値（1d6+10000）ができる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d6+10000',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('1d6+10000')
      expect(result.rolls).toHaveLength(1)
      expect(result.modifier).toBe('+10000')
      expect(result.total).toBe(result.sum + 10000)
    })

    it('大文字小文字を区別しない（1D6）', async () => {
      const args: FunctionCallArgs = {
        expression: '1D6',
      }

      const result = await rollDice(args, mockContext)

      expect(result.expression).toBe('1D6')
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls![0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls![0]).toBeLessThanOrEqual(6)
    })
  })

  describe('異常系', () => {
    it('expressionが未指定の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {}

      await expect(rollDice(args, mockContext)).rejects.toThrow('ダイス式が指定されていません。')
    })

    it('無効なダイス形式の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        expression: 'invalid',
      }

      await expect(rollDice(args, mockContext)).rejects.toThrow('無効なダイス形式です。「(個数)d(面数)+(補正値)」の形式で指定してください。(例: 1d6, 2d10+5)')
    })

    it('個数が0の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        expression: '0d6',
      }

      await expect(rollDice(args, mockContext)).rejects.toThrow('ダイスの個数は1個から100個までです。')
    })

    it('個数が101以上の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        expression: '101d6',
      }

      await expect(rollDice(args, mockContext)).rejects.toThrow('ダイスの個数は1個から100個までです。')
    })

    it('面数が0の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d0',
      }

      await expect(rollDice(args, mockContext)).rejects.toThrow('ダイスの面数は1面から1000面までです。')
    })

    it('面数が1001以上の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d1001',
      }

      await expect(rollDice(args, mockContext)).rejects.toThrow('ダイスの面数は1面から1000面までです。')
    })

    it('補正値が10001以上の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d6+10001',
      }

      await expect(rollDice(args, mockContext)).rejects.toThrow('補正値は10000までです。')
    })

    it('負の補正値が-10001以下の場合はエラーを投げる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d6-10001',
      }

      await expect(rollDice(args, mockContext)).rejects.toThrow('補正値は10000までです。')
    })
  })

  describe('ランダム性のテスト', () => {
    it('複数回実行して異なる結果が得られる', async () => {
      const args: FunctionCallArgs = {
        expression: '1d100',
      }

      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await rollDice(args, mockContext)
        results.push(result.rolls![0])
      }

      // 全て異なる結果が得られることを確認（確率的に）
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })

    it('複数ダイスでもそれぞれがランダム', async () => {
      const args: FunctionCallArgs = {
        expression: '5d6',
      }

      const result = await rollDice(args, mockContext)

      expect(result.rolls).toHaveLength(5)

      // 全て異なる結果が得られることを確認（確率的に）
      const uniqueResults = new Set(result.rolls)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })
  })

  describe('境界値のテスト', () => {
    it('最小値（1）が生成される', async () => {
      const args: FunctionCallArgs = {
        expression: '1d2',
      }

      let foundMin = false
      for (let i = 0; i < 100; i++) {
        const result = await rollDice(args, mockContext)
        if (result.rolls![0] === 1) {
          foundMin = true
          break
        }
      }
      expect(foundMin).toBe(true)
    })

    it('最大値が生成される', async () => {
      const args: FunctionCallArgs = {
        expression: '1d2',
      }

      let foundMax = false
      for (let i = 0; i < 100; i++) {
        const result = await rollDice(args, mockContext)
        if (result.rolls![0] === 2) {
          foundMax = true
          break
        }
      }
      expect(foundMax).toBe(true)
    })
  })

  describe('補正値の計算', () => {
    it('正の補正値が正しく計算される', async () => {
      const args: FunctionCallArgs = {
        expression: '1d1+10', // 1d1は常に1
      }

      const result = await rollDice(args, mockContext)

      expect(result.rolls![0]).toBe(1)
      expect(result.sum).toBe(1)
      expect(result.modifier).toBe('+10')
      expect(result.total).toBe(11)
    })

    it('負の補正値が正しく計算される', async () => {
      const args: FunctionCallArgs = {
        expression: '1d1-5', // 1d1は常に1
      }

      const result = await rollDice(args, mockContext)

      expect(result.rolls![0]).toBe(1)
      expect(result.sum).toBe(1)
      expect(result.modifier).toBe('-5')
      expect(result.total).toBe(-4)
    })

    it('補正値なしの場合の表示', async () => {
      const args: FunctionCallArgs = {
        expression: '1d6',
      }

      const result = await rollDice(args, mockContext)

      expect(result.modifier).toBe('なし')
      expect(result.total).toBe(result.sum)
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(rollDiceDeclaration.name).toBe('rollDice')
      expect(rollDiceDeclaration.description).toContain('ダイスロールを実行')
      expect(rollDiceDeclaration.parameters?.type).toBe('OBJECT')
      expect(rollDiceDeclaration.parameters?.required).toContain('expression')
    })
  })
})
