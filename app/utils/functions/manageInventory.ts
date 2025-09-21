/**
 * インベントリ管理関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'

/**
 * キャラクターの所持品を管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、キャラクターのインベントリを
 * 管理します。アイテムの追加、削除、確認機能を提供します。永続メモリを
 * 使用してセッション間でデータを保持し、各キャラクターの所持品を
 * 個別に管理できます。
 *
 * @async
 * @function manageInventory
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.characterName - 操作対象のキャラクター名（必須）
 * @param {string} args.action - 実行するアクション（必須）
 *   - "add": アイテムを指定した個数追加
 *   - "remove": アイテムを指定した個数削除（所持数が不足の場合は可能な分だけ削除）
 *   - "check": アイテムの現在の所持数を確認
 * @param {string} args.itemName - 操作対象のアイテム名（必須）
 * @param {number} [args.quantity] - 追加・削除する個数（デフォルト: 1）
 *   actionが"add", "remove"の場合は1以上の数値である必要があります
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<object>} 操作結果を含むオブジェクト
 *   - `characterName`: 操作対象のキャラクター名
 *   - `action`: 実行されたアクション
 *   - `itemName`: 操作対象のアイテム名
 *   - `quantity`: 指定した個数（add、removeアクション時）
 *   - `currentQuantity`: 変更前の所持数（add、removeアクション時）
 *   - `newQuantity`: 変更後の所持数（add、removeアクション時）
 *   - `removedQuantity`: 実際に削除された個数（removeアクション時）
 *   - `message`: 操作結果の説明メッセージ
 *
 * @throws {Error} 必須引数が不足している場合
 * @throws {Error} 無効なアクションが指定された場合
 * @throws {Error} 無効な個数が指定された場合（add、removeアクション時）
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
  logger.info(`[Function Calling] manageInventoryが呼び出されました。コンテキスト:`, { component: 'manageInventory' }, context)

  const characterName = args.characterName as string
  const action = args.action as string
  const itemName = args.itemName as string
  const quantity = (args.quantity as number) || 1

  if (!characterName || !action || !itemName) {
    const errorMsg = "引数 'characterName', 'action', 'itemName' は必須です。"
    logger.info(`[Function Calling] manageInventory: ${errorMsg}`, { component: 'manageInventory' })
    throw new Error(errorMsg)
  }

  if (['add', 'remove'].includes(action) && (typeof quantity !== 'number' || quantity <= 0)) {
    const errorMsg = `アクション '${action}' には1以上の数値型の 'quantity' が必要です。`
    logger.info(`[Function Calling] manageInventory: ${errorMsg}`, { component: 'manageInventory' })
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
        logger.info(`[Function Calling] manageInventory: 処理完了:`, result)
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
          logger.info(`[Function Calling] manageInventory: 処理完了:`, result)
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
        logger.info(`[Function Calling] manageInventory: 処理完了:`, result)
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
        logger.info(`[Function Calling] manageInventory: 処理完了:`, result)
        return result
      }

      default:
        throw new Error(`無効なアクションです: ${action}`)
    }
  } catch (error) {
    logger.info(`[Function Calling] manageInventoryでエラーが発生しました:`, { component: 'manageInventory' }, error)
    throw new Error(`インベントリ操作中にエラーが発生しました: ${(error as Error).message}`)
  }
}

/**
 * manageInventory関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageInventory関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageInventoryDeclaration
 * @property {string} name - 関数名（"manageInventory"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {string[]} parameters.required - 必須パラメータの配列
 *
 */
export const manageInventoryDeclaration: FunctionDeclaration = {
  name: 'manageInventory',
  description: 'キャラクターの所持品を管理します。追加、削除、確認の操作が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      characterName: {
        type: Type.STRING,
        description: '操作対象のキャラクター名',
      },
      action: {
        type: Type.STRING,
        description: '実行するアクション。「add」で追加、「remove」で削除、「check」で確認',
        enum: ['add', 'remove', 'check'],
      },
      itemName: {
        type: Type.STRING,
        description: '操作対象のアイテム名',
      },
      quantity: {
        type: Type.NUMBER,
        description: 'add、removeアクションで使用する個数（デフォルト: 1）',
      },
    },
    required: ['characterName', 'action', 'itemName'],
  },
}
