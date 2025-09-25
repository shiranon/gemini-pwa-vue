import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageCharacterStatus, manageCharacterStatusDeclaration } from '~/utils/functions/manageCharacterStatus'

describe('manageCharacterStatus', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('ステータス値を設定できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'set',
        statusKey: 'HP',
        value: 100,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.characterName).toBe('テストキャラ')
      expect(result.statusKey).toBe('HP')
      expect(result.action).toBe('set')
      expect(result.oldValue).toBe(0) // 未設定の場合は0から開始
      expect(result.newValue).toBe(100)
      expect(result.message).toContain('テストキャラのHPを100に設定しました')
    })

    it('ステータス値を増加できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'increase',
        statusKey: 'MP',
        value: 20,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('increase')
      expect(result.oldValue).toBe(0) // 未設定の場合は0から開始
      expect(result.newValue).toBe(20)
      expect(result.message).toContain('テストキャラのMPが20上昇し、20になりました')
    })

    it('既存のステータス値を増加できる', async () => {
      // 最初にステータスを設定
      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'ATK',
          value: 50,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'increase',
        statusKey: 'ATK',
        value: 10,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.oldValue).toBe(50)
      expect(result.newValue).toBe(60)
      expect(result.message).toContain('テストキャラのATKが10上昇し、60になりました')
    })

    it('ステータス値を減少できる', async () => {
      // 最初にステータスを設定
      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'HP',
          value: 100,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'decrease',
        statusKey: 'HP',
        value: 25,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('decrease')
      expect(result.oldValue).toBe(100)
      expect(result.newValue).toBe(75)
      expect(result.message).toContain('テストキャラのHPが25減少し、75になりました')
    })

    it('未設定ステータス値を減少できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'decrease',
        statusKey: 'HP',
        value: 10,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.oldValue).toBe(0) // 未設定の場合は0から開始
      expect(result.newValue).toBe(-10)
      expect(result.message).toContain('テストキャラのHPが10減少し、-10になりました')
    })

    it('ステータス値を取得できる', async () => {
      // 最初にステータスを設定
      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'DEF',
          value: 30,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'get',
        statusKey: 'DEF',
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('get')
      expect(result.value).toBe(30)
      expect(result.message).toContain('テストキャラの現在のDEFは30です')
    })

    it('未設定ステータス値を取得できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'get',
        statusKey: 'SPD',
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('get')
      expect(result.value).toBe(0) // 未設定の場合は0
      expect(result.message).toContain('テストキャラの現在のSPDは0です')
    })

    it('複数のステータスを管理できる', async () => {
      // 複数のステータスを設定
      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'HP',
          value: 100,
        },
        mockContext
      )

      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'MP',
          value: 50,
        },
        mockContext
      )

      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'ATK',
          value: 25,
        },
        mockContext
      )

      // それぞれを取得して確認
      const hpResult = await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'get',
          statusKey: 'HP',
        },
        mockContext
      )

      const mpResult = await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'get',
          statusKey: 'MP',
        },
        mockContext
      )

      const atkResult = await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'get',
          statusKey: 'ATK',
        },
        mockContext
      )

      expect('error' in hpResult).toBe(false)
      if ('error' in hpResult) return
      expect('error' in mpResult).toBe(false)
      if ('error' in mpResult) return
      expect('error' in atkResult).toBe(false)
      if ('error' in atkResult) return

      expect(hpResult.value).toBe(100)
      expect(mpResult.value).toBe(50)
      expect(atkResult.value).toBe(25)
    })

    it('負の値も設定できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'set',
        statusKey: 'HP',
        value: -10,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.newValue).toBe(-10)
      expect(result.message).toContain('テストキャラのHPを-10に設定しました')
    })

    it('小数値も設定できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'set',
        statusKey: 'LUK',
        value: 12.5,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.newValue).toBe(12.5)
    })
  })

  describe('異常系', () => {
    it('characterNameが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        statusKey: 'HP',
        value: 100,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'characterName', 'action', 'statusKey' は必須です。")
      }
    })

    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        statusKey: 'HP',
        value: 100,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'characterName', 'action', 'statusKey' は必須です。")
      }
    })

    it('statusKeyが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'set',
        value: 100,
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'characterName', 'action', 'statusKey' は必須です。")
      }
    })

    it('setアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'set',
        statusKey: 'HP',
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("アクション 'set' には数値型の 'value' が必要です。")
      }
    })

    it('increaseアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'increase',
        statusKey: 'HP',
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("アクション 'increase' には数値型の 'value' が必要です。")
      }
    })

    it('decreaseアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'decrease',
        statusKey: 'HP',
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("アクション 'decrease' には数値型の 'value' が必要です。")
      }
    })

    it('setアクションでvalueが数値でない場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'set',
        statusKey: 'HP',
        value: 'not_a_number',
      }

      const result = await manageCharacterStatus(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("アクション 'set' には数値型の 'value' が必要です。")
      }
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'invalid_action',
        statusKey: 'HP',
        value: 100,
      }

      const result = await manageCharacterStatus(args, mockContext)

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
        characterName: 'テストキャラ',
        action: 'set',
        statusKey: 'HP',
        value: 100,
      }

      const result = await manageCharacterStatus(args, contextWithoutMemory)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.characterName).toBe('テストキャラ')
      expect(contextWithoutMemory.persistentMemory).toBeDefined()
      expect(contextWithoutMemory.persistentMemory!['character_テストキャラ']).toBeDefined()
    })

    it('複数のキャラクターのステータスを独立して管理できる', async () => {
      // キャラクター1のステータスを設定
      await manageCharacterStatus(
        {
          characterName: 'キャラ1',
          action: 'set',
          statusKey: 'HP',
          value: 100,
        },
        mockContext
      )

      // キャラクター2のステータスを設定
      await manageCharacterStatus(
        {
          characterName: 'キャラ2',
          action: 'set',
          statusKey: 'HP',
          value: 80,
        },
        mockContext
      )

      // それぞれのステータスを取得して確認
      const result1 = await manageCharacterStatus(
        {
          characterName: 'キャラ1',
          action: 'get',
          statusKey: 'HP',
        },
        mockContext
      )

      const result2 = await manageCharacterStatus(
        {
          characterName: 'キャラ2',
          action: 'get',
          statusKey: 'HP',
        },
        mockContext
      )

      expect('error' in result1).toBe(false)
      if ('error' in result1) return
      expect('error' in result2).toBe(false)
      if ('error' in result2) return

      expect(result1.value).toBe(100)
      expect(result2.value).toBe(80)
    })

    it('同じキャラクターの複数のステータスが独立して管理される', async () => {
      // 複数のステータスを設定
      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'HP',
          value: 100,
        },
        mockContext
      )

      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'set',
          statusKey: 'MP',
          value: 50,
        },
        mockContext
      )

      // HPを変更してもMPは影響を受けない
      await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'decrease',
          statusKey: 'HP',
          value: 20,
        },
        mockContext
      )

      const hpResult = await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'get',
          statusKey: 'HP',
        },
        mockContext
      )

      const mpResult = await manageCharacterStatus(
        {
          characterName: 'テストキャラ',
          action: 'get',
          statusKey: 'MP',
        },
        mockContext
      )

      expect('error' in hpResult).toBe(false)
      if ('error' in hpResult) return
      expect('error' in mpResult).toBe(false)
      if ('error' in mpResult) return

      expect(hpResult.value).toBe(80)
      expect(mpResult.value).toBe(50)
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageCharacterStatusDeclaration.name).toBe('manageCharacterStatus')
      expect(manageCharacterStatusDeclaration.description).toContain('キャラクターのステータス')
      expect(manageCharacterStatusDeclaration.parameters?.type).toBe('OBJECT')
      expect(manageCharacterStatusDeclaration.parameters?.required).toContain('characterName')
      expect(manageCharacterStatusDeclaration.parameters?.required).toContain('action')
      expect(manageCharacterStatusDeclaration.parameters?.required).toContain('statusKey')
    })
  })
})
