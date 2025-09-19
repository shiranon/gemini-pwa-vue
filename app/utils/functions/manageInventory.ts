/**
 * インベントリ管理関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

/**
 * キャラクターの所持品を管理する関数
 */
export async function manageInventory(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  characterName: string
  action: string
  itemName: string
  quantity?: number
  currentQuantity?: number
  newQuantity?: number
  removedQuantity?: number
  message: string
}> {
  console.log(`[Function Calling] manageInventoryが呼び出されました。コンテキスト:`, context)

  const characterName = args.character_name as string
  const action = args.action as string
  const itemName = args.item_name as string
  const quantity = (args.quantity as number) || 1

  if (!characterName || !action || !itemName) {
    const errorMsg = "引数 'character_name', 'action', 'item_name' は必須です。"
    console.error(`[Function Calling] manageInventory: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  if (['add', 'remove'].includes(action) && (typeof quantity !== 'number' || quantity <= 0)) {
    const errorMsg = `アクション '${action}' には1以上の数値型の 'quantity' が必要です。`
    console.error(`[Function Calling] manageInventory: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  try {
    // persistentMemoryを使用する場合の処理
    if (!context.persistentMemory) {
      context.persistentMemory = {}
    }
    if (!context.persistentMemory.inventories) {
      context.persistentMemory.inventories = {}
    }
    const inventories = context.persistentMemory.inventories as Record<string, Record<string, number>>
    if (!inventories[characterName]) {
      inventories[characterName] = {}
    }
    const characterInventory = inventories[characterName]
    const currentQuantity = characterInventory[itemName] || 0

    switch (action) {
      case 'add': {
        const newQuantity = currentQuantity + quantity
        characterInventory[itemName] = newQuantity
        const message = `${characterName}は「${itemName}」を${quantity}個手に入れた。(所持数: ${newQuantity})`
        const result = {
          characterName,
          action: 'add',
          itemName,
          quantity,
          currentQuantity,
          newQuantity,
          message,
        }
        console.log(`[Function Calling] manageInventory: 処理完了:`, result)
        return result
      }

      case 'remove': {
        const removedAmount = Math.min(currentQuantity, quantity)
        if (removedAmount === 0) {
          const message = `${characterName}は「${itemName}」を持っていないため使えなかった。`
          const result = {
            characterName,
            action: 'remove',
            itemName,
            quantity,
            currentQuantity,
            removedQuantity: 0,
            message,
          }
          console.log(`[Function Calling] manageInventory: 処理完了:`, result)
          return result
        }
        const newQuantity = currentQuantity - removedAmount
        if (newQuantity > 0) {
          characterInventory[itemName] = newQuantity
        } else {
          // 動的プロパティの削除を避けるため、0に設定
          characterInventory[itemName] = 0
        }
        const message =
          removedAmount < quantity
            ? `${characterName}は「${itemName}」を${removedAmount}個しか持っていなかったため、全て使った。(残り: 0)`
            : `${characterName}は「${itemName}」を${removedAmount}個使った。(残り: ${newQuantity})`
        const result = {
          characterName,
          action: 'remove',
          itemName,
          quantity,
          currentQuantity,
          newQuantity,
          removedQuantity: removedAmount,
          message,
        }
        console.log(`[Function Calling] manageInventory: 処理完了:`, result)
        return result
      }

      case 'check': {
        const message = `${characterName}は「${itemName}」を${currentQuantity}個持っています。`
        const result = {
          characterName,
          action: 'check',
          itemName,
          currentQuantity,
          message,
        }
        console.log(`[Function Calling] manageInventory: 処理完了:`, result)
        return result
      }

      default:
        throw new Error(`無効なアクションです: ${action}`)
    }
  } catch (error) {
    console.error(`[Function Calling] manageInventoryでエラーが発生しました:`, error)
    throw new Error(`インベントリ操作中にエラーが発生しました: ${(error as Error).message}`)
  }
}

/**
 * manageInventory関数の宣言
 */
export const manageInventoryDeclaration: FunctionDeclaration = {
  name: 'manageInventory',
  description: 'キャラクターの所持品を管理します。追加、削除、確認の操作が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      character_name: {
        type: Type.STRING,
        description: '操作対象のキャラクター名',
      },
      action: {
        type: Type.STRING,
        description: '実行するアクション。「add」で追加、「remove」で削除、「check」で確認',
        enum: ['add', 'remove', 'check'],
      },
      item_name: {
        type: Type.STRING,
        description: '操作対象のアイテム名',
      },
      quantity: {
        type: Type.NUMBER,
        description: 'add、removeアクションで使用する個数（デフォルト: 1）',
      },
    },
    required: ['character_name', 'action', 'item_name'],
  },
}
