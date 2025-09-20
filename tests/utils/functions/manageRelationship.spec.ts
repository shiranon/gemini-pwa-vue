import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageRelationship, manageRelationshipDeclaration } from '~/utils/functions/manageRelationship'

describe('manageRelationship', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {
        gameDay: 1,
      },
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('関係値を設定できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'set',
        value: 50,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(50)
      expect(result.message).toContain('太郎から花子への好感度が更新され、50になりました')
    })

    it('デフォルト軸（好感度）で関係値を設定できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        action: 'set',
        value: 30,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(30)
      expect(result.message).toContain('太郎から花子への好感度が更新され、30になりました')
    })

    it('関係値を増加できる', async () => {
      // 最初に関係値を設定
      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'set',
          value: 40,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'increase',
        value: 10,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(50)
      expect(result.message).toContain('太郎から花子への好感度が更新され、50になりました')
    })

    it('関係値を減少できる', async () => {
      // 最初に関係値を設定
      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'set',
          value: 60,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'decrease',
        value: 15,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(45)
      expect(result.message).toContain('太郎から花子への好感度が更新され、45になりました')
    })

    it('未設定の関係値を増減できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '信頼度',
        action: 'increase',
        value: 20,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(20) // 未設定の場合は0から開始
      expect(result.message).toContain('太郎から花子への信頼度が更新され、20になりました')
    })

    it('関係値を取得できる', async () => {
      // 最初に関係値を設定
      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'set',
          value: 75,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'get',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.value).toBe(75)
      expect(result.message).toContain('太郎から花子への好感度は現在 75 です')
    })

    it('未設定の関係値を取得できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '緊張度',
        action: 'get',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.value).toBe(0) // 未設定の場合は0
      expect(result.message).toContain('太郎から花子への緊張度は現在 0 です')
    })

    it('対象キャラクターの全関係軸を取得できる', async () => {
      // 複数の関係軸を設定
      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'set',
          value: 50,
        },
        mockContext
      )

      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '信頼度',
          action: 'set',
          value: 30,
        },
        mockContext
      )

      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '緊張度',
          action: 'set',
          value: 20,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        action: 'getAllAxes',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.relations).toEqual({
        好感度: 50,
        信頼度: 30,
        緊張度: 20,
      })
      expect(result.message).toContain('太郎から花子への全関係軸を取得しました')
    })

    it('未設定の対象キャラクターの全関係軸を取得できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        action: 'getAllAxes',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.relations).toEqual({})
      expect(result.message).toContain('太郎から花子への関係はまだ設定されていません')
    })

    it('主体キャラクターの全関係を取得できる', async () => {
      // 複数の対象キャラクターに関係を設定
      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'set',
          value: 50,
        },
        mockContext
      )

      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '次郎',
          axis: '好感度',
          action: 'set',
          value: 30,
        },
        mockContext
      )

      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '信頼度',
          action: 'set',
          value: 40,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        action: 'getAllFromSource',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.relations).toEqual({
        花子: {
          好感度: 50,
          信頼度: 40,
        },
        次郎: {
          好感度: 30,
        },
      })
      expect(result.message).toContain('太郎が持つ全ての人間関係を取得しました')
    })

    it('未設定の主体キャラクターの全関係を取得できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        action: 'getAllFromSource',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.relations).toEqual({})
      expect(result.message).toContain('太郎の人間関係はまだ設定されていません')
    })

    it('上限値で関係値を制限できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'set',
        value: 100,
        clampMax: 80,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(80) // 上限値で制限される
    })

    it('下限値で関係値を制限できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'set',
        value: -50,
        clampMin: -20,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(-20) // 下限値で制限される
    })

    it('上下限値で関係値を制限できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'increase',
        value: 50,
        clampMin: 0,
        clampMax: 100,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(50) // 0 + 50 = 50（制限内）
    })
  })

  describe('異常系', () => {
    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        value: 50,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("引数 'action' は必須です。")
    })

    it('sourceCharacterが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        targetCharacter: '花子',
        axis: '好感度',
        action: 'set',
        value: 50,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("引数 'sourceCharacter' は必須です。")
    })

    it('getアクションでtargetCharacterが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        axis: '好感度',
        action: 'get',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("アクション 'get' には 'targetCharacter' が必須です。")
    })

    it('setアクションでtargetCharacterが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        axis: '好感度',
        action: 'set',
        value: 50,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("アクション 'set' には 'targetCharacter' が必須です。")
    })

    it('getアクションでaxisが未指定の場合はデフォルト軸（好感度）で取得できる', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        action: 'get',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.value).toBe(0) // 未設定の場合は0
      expect(result.message).toContain('太郎から花子への好感度は現在 0 です')
    })

    it('setアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'set',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("アクション 'set' には数値型の 'value' が必要です。")
    })

    it('increaseアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'increase',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("アクション 'increase' には数値型の 'value' が必要です。")
    })

    it('decreaseアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'decrease',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("アクション 'decrease' には数値型の 'value' が必要です。")
    })

    it('setアクションでvalueが数値でない場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'set',
        value: 'not_a_number',
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe("アクション 'set' には数値型の 'value' が必要です。")
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'invalid_action',
        value: 50,
      }

      const result = await manageRelationship(args, mockContext)

      expect(result.error).toBe('無効なアクションです: invalid_action')
    })
  })

  describe('永続メモリの管理', () => {
    it('persistentMemoryが未初期化の場合は自動で初期化する', async () => {
      const contextWithoutMemory: FunctionExecutionContext = {
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        sourceCharacter: '太郎',
        targetCharacter: '花子',
        axis: '好感度',
        action: 'set',
        value: 50,
      }

      const result = await manageRelationship(args, contextWithoutMemory)

      expect(result.success).toBe(true)
      expect(contextWithoutMemory.persistentMemory).toBeDefined()
      expect(contextWithoutMemory.persistentMemory!.relationships).toBeDefined()
      expect(contextWithoutMemory.persistentMemory!.gameDay).toBe(1)
    })

    it('複数の関係軸を独立して管理できる', async () => {
      // 複数の関係軸を設定
      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'set',
          value: 50,
        },
        mockContext
      )

      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '信頼度',
          action: 'set',
          value: 30,
        },
        mockContext
      )

      // それぞれを取得して確認
      const result1 = await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'get',
        },
        mockContext
      )

      const result2 = await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '信頼度',
          action: 'get',
        },
        mockContext
      )

      expect(result1.success).toBe(true)
      expect(result1.value).toBe(50)
      expect(result2.success).toBe(true)
      expect(result2.value).toBe(30)
    })

    it('複数の対象キャラクターを独立して管理できる', async () => {
      // 複数の対象キャラクターに関係を設定
      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'set',
          value: 50,
        },
        mockContext
      )

      await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '次郎',
          axis: '好感度',
          action: 'set',
          value: 30,
        },
        mockContext
      )

      // それぞれを取得して確認
      const result1 = await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '花子',
          axis: '好感度',
          action: 'get',
        },
        mockContext
      )

      const result2 = await manageRelationship(
        {
          sourceCharacter: '太郎',
          targetCharacter: '次郎',
          axis: '好感度',
          action: 'get',
        },
        mockContext
      )

      expect(result1.success).toBe(true)
      expect(result1.value).toBe(50)
      expect(result2.success).toBe(true)
      expect(result2.value).toBe(30)
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageRelationshipDeclaration.name).toBe('manageRelationship')
      expect(manageRelationshipDeclaration.description).toContain('関係値')
      expect(manageRelationshipDeclaration.parameters?.type).toBe('OBJECT')
      expect(manageRelationshipDeclaration.parameters?.required).toContain('sourceCharacter')
      expect(manageRelationshipDeclaration.parameters?.required).toContain('action')
    })
  })
})
