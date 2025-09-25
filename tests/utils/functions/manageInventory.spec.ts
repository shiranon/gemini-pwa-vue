import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageInventory, manageInventoryDeclaration } from '~/utils/functions/manageInventory'

describe('manageInventory', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('アイテムを追加できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'add',
        itemName: '剣',
        quantity: 1,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if (!('error' in result)) {
        expect(result.characterName).toBe('テストキャラ')
        expect(result.action).toBe('add')
        expect(result.itemName).toBe('剣')
        expect(result.quantity).toBe(1)
        expect(result.currentQuantity).toBe(0)
        expect(result.newQuantity).toBe(1)
        expect(result.message).toContain('テストキャラは「剣」を1個手に入れた')
      }
    })

    it('複数個のアイテムを追加できる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'add',
        itemName: 'ポーション',
        quantity: 5,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.quantity).toBe(5)
      expect(result.currentQuantity).toBe(0)
      expect(result.newQuantity).toBe(5)
      expect(result.message).toContain('テストキャラは「ポーション」を5個手に入れた')
    })

    it('既存のアイテムに追加できる', async () => {
      // 最初にアイテムを追加
      await manageInventory(
        {
          characterName: 'テストキャラ',
          action: 'add',
          itemName: '剣',
          quantity: 2,
        },
        mockContext
      )

      // さらに追加
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'add',
        itemName: '剣',
        quantity: 3,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.currentQuantity).toBe(2)
      expect(result.newQuantity).toBe(5)
      expect(result.message).toContain('テストキャラは「剣」を3個手に入れた')
    })

    it('アイテムを削除できる', async () => {
      // 最初にアイテムを追加
      await manageInventory(
        {
          characterName: 'テストキャラ',
          action: 'add',
          itemName: 'ポーション',
          quantity: 5,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'remove',
        itemName: 'ポーション',
        quantity: 2,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('remove')
      expect(result.quantity).toBe(2)
      expect(result.currentQuantity).toBe(5)
      expect(result.newQuantity).toBe(3)
      expect(result.removedQuantity).toBe(2)
      expect(result.message).toContain('テストキャラは「ポーション」を2個使った')
    })

    it('所持数より多く削除しようとした場合は可能な分だけ削除する', async () => {
      // 最初にアイテムを追加
      await manageInventory(
        {
          characterName: 'テストキャラ',
          action: 'add',
          itemName: 'ポーション',
          quantity: 3,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'remove',
        itemName: 'ポーション',
        quantity: 5,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.quantity).toBe(5)
      expect(result.currentQuantity).toBe(3)
      expect(result.newQuantity).toBe(0)
      expect(result.removedQuantity).toBe(3)
      expect(result.message).toContain('テストキャラは「ポーション」を3個しか持っていなかったため、全て使った')
    })

    it('所持していないアイテムを削除しようとした場合はエラーメッセージを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'remove',
        itemName: '存在しないアイテム',
        quantity: 1,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('remove')
      expect(result.quantity).toBe(1)
      expect(result.currentQuantity).toBe(0)
      expect(result.removedQuantity).toBe(0)
      expect(result.message).toContain('テストキャラは「存在しないアイテム」を持っていないため使えなかった')
    })

    it('アイテムの所持数を確認できる', async () => {
      // 最初にアイテムを追加
      await manageInventory(
        {
          characterName: 'テストキャラ',
          action: 'add',
          itemName: '盾',
          quantity: 2,
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'check',
        itemName: '盾',
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('check')
      expect(result.currentQuantity).toBe(2)
      expect(result.message).toContain('テストキャラは「盾」を2個持っています')
    })

    it('所持していないアイテムの確認もできる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'check',
        itemName: '未所持アイテム',
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('check')
      expect(result.currentQuantity).toBe(0)
      expect(result.message).toContain('テストキャラは「未所持アイテム」を0個持っています')
    })

    it('デフォルトでquantityは1になる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'add',
        itemName: 'アイテム',
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.quantity).toBe(1)
      expect(result.newQuantity).toBe(1)
    })
  })

  describe('異常系', () => {
    it('characterNameが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'add',
        itemName: '剣',
        quantity: 1,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'characterName', 'action', 'itemName' は必須です。")
      }
    })

    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        itemName: '剣',
        quantity: 1,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'characterName', 'action', 'itemName' は必須です。")
      }
    })

    it('itemNameが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'add',
        quantity: 1,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("引数 'characterName', 'action', 'itemName' は必須です。")
      }
    })

    it('addアクションでquantityが0の場合はデフォルト値1が使われる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'add',
        itemName: '剣',
        quantity: 0,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('add')
      expect(result.quantity).toBe(1) // デフォルト値1が使われる
      expect(result.newQuantity).toBe(1)
      expect(result.message).toContain('テストキャラは「剣」を1個手に入れた')
    })

    it('addアクションでquantityが負の数の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'add',
        itemName: '剣',
        quantity: -1,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe("アクション 'add' には1以上の数値型の 'quantity' が必要です。")
      }
    })

    it('removeアクションでquantityが0の場合はデフォルト値1が使われる', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'remove',
        itemName: '剣',
        quantity: 0,
      }

      const result = await manageInventory(args, mockContext)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.action).toBe('remove')
      expect(result.quantity).toBe(1) // デフォルト値1が使われる
      expect(result.removedQuantity).toBe(0) // 所持していないので0個削除
      expect(result.message).toContain('テストキャラは「剣」を持っていないため使えなかった')
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        characterName: 'テストキャラ',
        action: 'invalid_action',
        itemName: '剣',
        quantity: 1,
      }

      const result = await manageInventory(args, mockContext)

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
        action: 'add',
        itemName: '剣',
        quantity: 1,
      }

      const result = await manageInventory(args, contextWithoutMemory)

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.characterName).toBe('テストキャラ')
      expect(contextWithoutMemory.persistentMemory).toBeDefined()
      expect(contextWithoutMemory.persistentMemory!.inventories).toBeDefined()
    })

    it('複数のキャラクターのインベントリを独立して管理できる', async () => {
      // キャラクター1のアイテムを追加
      await manageInventory(
        {
          characterName: 'キャラ1',
          action: 'add',
          itemName: '剣',
          quantity: 2,
        },
        mockContext
      )

      // キャラクター2のアイテムを追加
      await manageInventory(
        {
          characterName: 'キャラ2',
          action: 'add',
          itemName: '剣',
          quantity: 3,
        },
        mockContext
      )

      // それぞれの所持数を確認
      const result1 = await manageInventory(
        {
          characterName: 'キャラ1',
          action: 'check',
          itemName: '剣',
        },
        mockContext
      )

      const result2 = await manageInventory(
        {
          characterName: 'キャラ2',
          action: 'check',
          itemName: '剣',
        },
        mockContext
      )

      expect('error' in result1).toBe(false)
      if ('error' in result1) return
      expect('error' in result2).toBe(false)
      if ('error' in result2) return

      expect(result1.currentQuantity).toBe(2)
      expect(result2.currentQuantity).toBe(3)
    })

    it('アイテムが0個になった場合は0に設定される', async () => {
      // アイテムを追加
      await manageInventory(
        {
          characterName: 'テストキャラ',
          action: 'add',
          itemName: 'ポーション',
          quantity: 2,
        },
        mockContext
      )

      // 全て削除
      const result = await manageInventory(
        {
          characterName: 'テストキャラ',
          action: 'remove',
          itemName: 'ポーション',
          quantity: 2,
        },
        mockContext
      )

      expect('error' in result).toBe(false)
      if ('error' in result) return

      expect(result.newQuantity).toBe(0)
      expect(result.removedQuantity).toBe(2)

      // 確認
      const checkResult = await manageInventory(
        {
          characterName: 'テストキャラ',
          action: 'check',
          itemName: 'ポーション',
        },
        mockContext
      )

      expect('error' in checkResult).toBe(false)
      if ('error' in checkResult) return

      expect(checkResult.currentQuantity).toBe(0)
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageInventoryDeclaration.name).toBe('manageInventory')
      expect(manageInventoryDeclaration.description).toContain('キャラクターの所持品')
      expect(manageInventoryDeclaration.parameters?.type).toBe('OBJECT')
      expect(manageInventoryDeclaration.parameters?.required).toContain('characterName')
      expect(manageInventoryDeclaration.parameters?.required).toContain('action')
      expect(manageInventoryDeclaration.parameters?.required).toContain('itemName')
    })
  })
})
