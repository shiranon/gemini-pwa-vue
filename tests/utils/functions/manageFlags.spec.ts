import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageFlags, manageFlagsDeclaration } from '~/utils/functions/manageFlags'

describe('manageFlags', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('フラグを設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        key: 'test_flag',
        value: 'test_value',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.key).toBe('test_flag')
      expect(result.oldValue).toBeUndefined()
      expect(result.newValue).toBe('test_value')
      expect(result.message).toContain('フラグ「test_flag」を「test_value」に設定しました')
    })

    it('数値フラグを設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        key: 'number_flag',
        value: 42,
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(42)
    })

    it('真偽値フラグを設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        key: 'boolean_flag',
        value: true,
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toBe(true)
    })

    it('オブジェクトフラグを設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        key: 'object_flag',
        value: { name: 'test', count: 5 },
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.newValue).toEqual({ name: 'test', count: 5 })
    })

    it('フラグを取得できる', async () => {
      // 最初にフラグを設定
      await manageFlags(
        {
          action: 'set',
          key: 'test_flag',
          value: 'test_value',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'get',
        key: 'test_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.key).toBe('test_flag')
      expect(result.oldValue).toBe('test_value')
      expect(result.newValue).toBe('test_value')
      expect(result.message).toContain('フラグ「test_flag」の現在の値は「test_value」です')
    })

    it('設定されていないフラグを取得できる', async () => {
      const args: FunctionCallArgs = {
        action: 'get',
        key: 'non_existent_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.key).toBe('non_existent_flag')
      expect(result.oldValue).toBeUndefined()
      expect(result.newValue).toBeUndefined()
      expect(result.message).toContain('フラグ「non_existent_flag」は設定されていません')
    })

    it('フラグを切り替えできる（true → false）', async () => {
      // 最初にtrueを設定
      await manageFlags(
        {
          action: 'set',
          key: 'toggle_flag',
          value: true,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'toggle',
        key: 'toggle_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.oldValue).toBe(true)
      expect(result.newValue).toBe(false)
      expect(result.message).toContain('フラグ「toggle_flag」を「false」に切り替えました')
    })

    it('フラグを切り替えできる（false → true）', async () => {
      // 最初にfalseを設定
      await manageFlags(
        {
          action: 'set',
          key: 'toggle_flag',
          value: false,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'toggle',
        key: 'toggle_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.oldValue).toBe(false)
      expect(result.newValue).toBe(true)
      expect(result.message).toContain('フラグ「toggle_flag」を「true」に切り替えました')
    })

    it('未設定フラグを切り替えできる（undefined → true）', async () => {
      const args: FunctionCallArgs = {
        action: 'toggle',
        key: 'new_toggle_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.oldValue).toBeUndefined()
      expect(result.newValue).toBe(true)
      expect(result.message).toContain('フラグ「new_toggle_flag」を「true」に切り替えました')
    })

    it('カウンターを増加できる', async () => {
      const args: FunctionCallArgs = {
        action: 'increase',
        key: 'counter',
        value: 5,
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.oldValue).toBe(0) // 未設定の場合は0から開始
      expect(result.newValue).toBe(5)
      expect(result.message).toContain('カウンター「counter」が5増加し、「5」になりました')
    })

    it('既存のカウンターを増加できる', async () => {
      // 最初にカウンターを設定
      await manageFlags(
        {
          action: 'set',
          key: 'counter',
          value: 10,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'increase',
        key: 'counter',
        value: 3,
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.oldValue).toBe(10)
      expect(result.newValue).toBe(13)
      expect(result.message).toContain('カウンター「counter」が3増加し、「13」になりました')
    })

    it('カウンターを減少できる', async () => {
      // 最初にカウンターを設定
      await manageFlags(
        {
          action: 'set',
          key: 'counter',
          value: 10,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'decrease',
        key: 'counter',
        value: 3,
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.oldValue).toBe(10)
      expect(result.newValue).toBe(7)
      expect(result.message).toContain('カウンター「counter」が3減少し、「7」になりました')
    })

    it('未設定カウンターを減少できる', async () => {
      const args: FunctionCallArgs = {
        action: 'decrease',
        key: 'new_counter',
        value: 2,
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.oldValue).toBe(0) // 未設定の場合は0から開始
      expect(result.newValue).toBe(-2)
      expect(result.message).toContain('カウンター「new_counter」が2減少し、「-2」になりました')
    })

    it('フラグを削除できる', async () => {
      // 最初にフラグを設定
      await manageFlags(
        {
          action: 'set',
          key: 'delete_flag',
          value: 'test_value',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'delete',
        key: 'delete_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.key).toBe('delete_flag')
      expect(result.message).toContain('フラグ「delete_flag」を削除しました')
    })

    it('存在しないフラグを削除しようとした場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'delete',
        key: 'non_existent_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.key).toBe('non_existent_flag')
      expect(result.message).toContain('フラグ「non_existent_flag」は存在しません')
    })

    it('TTL付きでフラグを設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        key: 'ttl_flag',
        value: 'test_value',
        ttlMinutes: 30,
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toContain('フラグ「ttl_flag」を「test_value」に設定しました')
      expect(result.message).toContain('30分後に自動消滅します')
    })
  })

  describe('異常系', () => {
    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        key: 'test_flag',
        value: 'test_value',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("引数 'key' と 'action' は必須です。")
    })

    it('keyが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        value: 'test_value',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("引数 'key' と 'action' は必須です。")
    })

    it('setアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        key: 'test_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("アクション 'set' には 'value' が必要です。")
    })

    it('increaseアクションでvalueが数値でない場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'increase',
        key: 'counter',
        value: 'not_a_number',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("アクション 'increase' には数値型の 'value' が必要です。")
    })

    it('decreaseアクションでvalueが数値でない場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'decrease',
        key: 'counter',
        value: 'not_a_number',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("アクション 'decrease' には数値型の 'value' が必要です。")
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'invalid_action',
        key: 'test_flag',
      }

      const result = await manageFlags(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('無効なアクションです: invalid_action')
    })
  })

  describe('永続メモリの管理', () => {
    it('persistentMemoryが未初期化の場合は自動で初期化する', async () => {
      const contextWithoutMemory: FunctionExecutionContext = {
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        action: 'set',
        key: 'test_flag',
        value: 'test_value',
      }

      const result = await manageFlags(args, contextWithoutMemory)

      expect(result.success).toBe(true)
      expect(contextWithoutMemory.persistentMemory).toBeDefined()
    })

    it('複数のフラグを独立して管理できる', async () => {
      // 複数のフラグを設定
      await manageFlags(
        {
          action: 'set',
          key: 'flag1',
          value: 'value1',
        },
        mockContext
      )

      await manageFlags(
        {
          action: 'set',
          key: 'flag2',
          value: 42,
        },
        mockContext
      )

      // それぞれを取得して確認
      const result1 = await manageFlags(
        {
          action: 'get',
          key: 'flag1',
        },
        mockContext
      )

      const result2 = await manageFlags(
        {
          action: 'get',
          key: 'flag2',
        },
        mockContext
      )

      expect(result1.success).toBe(true)
      expect(result1.newValue).toBe('value1')
      expect(result2.success).toBe(true)
      expect(result2.newValue).toBe(42)
    })

    it('削除されたフラグは取得できない', async () => {
      // フラグを設定
      await manageFlags(
        {
          action: 'set',
          key: 'temp_flag',
          value: 'temp_value',
        },
        mockContext
      )

      // フラグを削除
      await manageFlags(
        {
          action: 'delete',
          key: 'temp_flag',
        },
        mockContext
      )

      // 削除されたフラグを取得
      const result = await manageFlags(
        {
          action: 'get',
          key: 'temp_flag',
        },
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.newValue).toBeUndefined()
      expect(result.message).toContain('フラグ「temp_flag」は設定されていません')
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageFlagsDeclaration.name).toBe('manageFlags')
      expect(manageFlagsDeclaration.description).toContain('フラグやカウンター')
      expect(manageFlagsDeclaration.parameters?.type).toBe('OBJECT')
      expect(manageFlagsDeclaration.parameters?.required).toContain('action')
      expect(manageFlagsDeclaration.parameters?.required).toContain('key')
    })
  })
})
