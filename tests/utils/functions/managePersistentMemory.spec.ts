import { Type } from '@google/genai'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { managePersistentMemory, managePersistentMemoryDeclaration } from '~/utils/functions/managePersistentMemory'

describe('managePersistentMemory', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    mock.clearAllMocks()
  })

  describe('正常系', () => {
    it('キーと値のペアを追加できる', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        key: 'test_key',
        value: 'test_value',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toBe('キー「test_key」に値を保存しました。')
    })

    it('数値を保存できる', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        key: 'number_key',
        value: 42,
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toBe('キー「number_key」に値を保存しました。')
    })

    it('真偽値を保存できる', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        key: 'boolean_key',
        value: true,
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toBe('キー「boolean_key」に値を保存しました。')
    })

    it('オブジェクトを保存できる', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        key: 'object_key',
        value: { name: 'test', count: 5 },
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toBe('キー「object_key」に値を保存しました。')
    })

    it('配列を保存できる', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        key: 'array_key',
        value: [1, 2, 3, 'test'],
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toBe('キー「array_key」に値を保存しました。')
    })

    it('保存した値を取得できる', async () => {
      // 最初に値を保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'test_key',
          value: 'test_value',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'get',
        key: 'test_key',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.key).toBe('test_key')
      expect(result.value).toBe('test_value')
    })

    it('保存したオブジェクトを取得できる', async () => {
      const testObject = { name: 'test', count: 5 }

      // 最初にオブジェクトを保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'object_key',
          value: testObject,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'get',
        key: 'object_key',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.key).toBe('object_key')
      expect(result.value).toEqual(testObject)
    })

    it('存在しないキーを取得しようとした場合はエラーメッセージを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'get',
        key: 'non_existent_key',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toBe('キー「non_existent_key」は見つかりませんでした。')
    })

    it('キーを削除できる', async () => {
      // 最初に値を保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'delete_key',
          value: 'delete_value',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'delete',
        key: 'delete_key',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toBe('キー「delete_key」を削除しました。')
    })

    it('存在しないキーを削除しようとした場合はエラーメッセージを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'delete',
        key: 'non_existent_key',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toBe('キー「non_existent_key」は見つかりませんでした。')
    })

    it('全てのキーの一覧を取得できる', async () => {
      // 複数のキーを保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'key1',
          value: 'value1',
        },
        mockContext
      )

      await managePersistentMemory(
        {
          action: 'add',
          key: 'key2',
          value: 'value2',
        },
        mockContext
      )

      await managePersistentMemory(
        {
          action: 'add',
          key: 'key3',
          value: 'value3',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'list',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.count).toBe(3)
      expect(result.keys).toContain('key1')
      expect(result.keys).toContain('key2')
      expect(result.keys).toContain('key3')
    })

    it('空のメモリで一覧を取得できる', async () => {
      const args: FunctionCallArgs = {
        action: 'list',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
      expect(result.keys).toEqual([])
    })

    it('削除されたキーは一覧に表示されない', async () => {
      // 複数のキーを保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'key1',
          value: 'value1',
        },
        mockContext
      )

      await managePersistentMemory(
        {
          action: 'add',
          key: 'key2',
          value: 'value2',
        },
        mockContext
      )

      // 1つのキーを削除
      await managePersistentMemory(
        {
          action: 'delete',
          key: 'key1',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'list',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.count).toBe(1)
      expect(result.keys).toEqual(['key2'])
    })

    it('同じキーで上書き保存できる', async () => {
      // 最初に値を保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'update_key',
          value: 'old_value',
        },
        mockContext
      )

      // 同じキーで新しい値を保存
      const args: FunctionCallArgs = {
        action: 'add',
        key: 'update_key',
        value: 'new_value',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toBe('キー「update_key」に値を保存しました。')

      // 新しい値が保存されていることを確認
      const getResult = await managePersistentMemory(
        {
          action: 'get',
          key: 'update_key',
        },
        mockContext
      )

      expect(getResult.success).toBe(true)
      expect(getResult.value).toBe('new_value')
    })
  })

  describe('異常系', () => {
    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        key: 'test_key',
        value: 'test_value',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("引数 'action' は必須です。")
    })

    it('addアクションでkeyが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        value: 'test_value',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("addアクションには 'key' と 'value' が必要です。")
    })

    it('addアクションでvalueが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        key: 'test_key',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("addアクションには 'key' と 'value' が必要です。")
    })

    it('getアクションでkeyが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'get',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("getアクションには 'key' が必要です。")
    })

    it('deleteアクションでkeyが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'delete',
      }

      const result = await managePersistentMemory(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("deleteアクションには 'key' が必要です。")
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'invalid_action',
        key: 'test_key',
      }

      const result = await managePersistentMemory(args, mockContext)

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
        action: 'add',
        key: 'test_key',
        value: 'test_value',
      }

      const result = await managePersistentMemory(args, contextWithoutMemory)

      expect(result.success).toBe(true)
      expect(contextWithoutMemory.persistentMemory).toBeDefined()
    })

    it('削除されたキーはundefinedに設定される', async () => {
      // 値を保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'test_key',
          value: 'test_value',
        },
        mockContext
      )

      // キーを削除
      await managePersistentMemory(
        {
          action: 'delete',
          key: 'test_key',
        },
        mockContext
      )

      // 削除されたキーはundefinedになっている
      expect(mockContext.persistentMemory!['test_key']).toBeUndefined()
    })

    it('複数のキーを独立して管理できる', async () => {
      // 複数のキーを保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'key1',
          value: 'value1',
        },
        mockContext
      )

      await managePersistentMemory(
        {
          action: 'add',
          key: 'key2',
          value: 42,
        },
        mockContext
      )

      await managePersistentMemory(
        {
          action: 'add',
          key: 'key3',
          value: { nested: 'object' },
        },
        mockContext
      )

      // それぞれを取得して確認
      const result1 = await managePersistentMemory(
        {
          action: 'get',
          key: 'key1',
        },
        mockContext
      )

      const result2 = await managePersistentMemory(
        {
          action: 'get',
          key: 'key2',
        },
        mockContext
      )

      const result3 = await managePersistentMemory(
        {
          action: 'get',
          key: 'key3',
        },
        mockContext
      )

      expect(result1.success).toBe(true)
      expect(result1.value).toBe('value1')
      expect(result2.success).toBe(true)
      expect(result2.value).toBe(42)
      expect(result3.success).toBe(true)
      expect(result3.value).toEqual({ nested: 'object' })
    })

    it('削除されたキーは取得できない', async () => {
      // 値を保存
      await managePersistentMemory(
        {
          action: 'add',
          key: 'temp_key',
          value: 'temp_value',
        },
        mockContext
      )

      // キーを削除
      await managePersistentMemory(
        {
          action: 'delete',
          key: 'temp_key',
        },
        mockContext
      )

      // 削除されたキーを取得
      const result = await managePersistentMemory(
        {
          action: 'get',
          key: 'temp_key',
        },
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.value).toBeUndefined()
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(managePersistentMemoryDeclaration.name).toBe('managePersistentMemory')
      expect(managePersistentMemoryDeclaration.description).toContain('永続メモリ')
      expect(managePersistentMemoryDeclaration.parameters?.type).toBe(Type.OBJECT)
      expect(managePersistentMemoryDeclaration.parameters?.required).toContain('action')
    })
  })
})
