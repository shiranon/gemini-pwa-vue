/**
 * キャラクターステータス関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

/**
 * キャラクターのステータス（HP, MPなど）を管理する関数
 */
export async function manageCharacterStatus(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  characterName: string
  statusKey: string
  action: string
  value?: number
  oldValue?: number
  newValue?: number
  message: string
}> {
  console.log(`[Function Calling] manageCharacterStatusが呼び出されました。コンテキスト:`, context)

  const characterName = args.characterName as string
  const action = args.action as string
  const statusKey = args.statusKey as string
  const value = args.value as number

  if (!characterName || !action || !statusKey) {
    const errorMsg = "引数 'characterName', 'action', 'statusKey' は必須です。"
    console.error(`[Function Calling] manageCharacterStatus: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  if (['set', 'increase', 'decrease'].includes(action) && typeof value !== 'number') {
    const errorMsg = `アクション '${action}' には数値型の 'value' が必要です。`
    console.error(`[Function Calling] manageCharacterStatus: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  try {
    // persistentMemoryを使用する場合の処理
    if (!context.persistentMemory) {
      context.persistentMemory = {}
    }
    const memoryKey = `character_${characterName}`
    if (!context.persistentMemory[memoryKey]) {
      context.persistentMemory[memoryKey] = {}
    }
    const characterStatus = context.persistentMemory[memoryKey] as Record<string, number>
    const currentValue = characterStatus[statusKey] || 0

    switch (action) {
      case 'set': {
        const newValue = value
        characterStatus[statusKey] = newValue
        const message = `${characterName}の${statusKey}を${newValue}に設定しました。`
        const result = {
          characterName,
          statusKey,
          action: 'set',
          oldValue: currentValue,
          newValue,
          message,
        }
        console.log(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
        return result
      }

      case 'increase': {
        const newValue = currentValue + value
        characterStatus[statusKey] = newValue
        const message = `${characterName}の${statusKey}が${value}上昇し、${newValue}になりました。`
        const result = {
          characterName,
          statusKey,
          action: 'increase',
          oldValue: currentValue,
          newValue,
          message,
        }
        console.log(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
        return result
      }

      case 'decrease': {
        const newValue = currentValue - value
        characterStatus[statusKey] = newValue
        const message = `${characterName}の${statusKey}が${value}減少し、${newValue}になりました。`
        const result = {
          characterName,
          statusKey,
          action: 'decrease',
          oldValue: currentValue,
          newValue,
          message,
        }
        console.log(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
        return result
      }

      case 'get': {
        const message = `${characterName}の現在の${statusKey}は${currentValue}です。`
        const result = {
          characterName,
          statusKey,
          action: 'get',
          value: currentValue,
          message,
        }
        console.log(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
        return result
      }

      default:
        throw new Error(`無効なアクションです: ${action}`)
    }
  } catch (error) {
    console.error(`[Function Calling] manageCharacterStatusでエラーが発生しました:`, error)
    throw new Error(`キャラクターステータス操作中にエラーが発生しました: ${(error as Error).message}`)
  }
}

/**
 * manageCharacterStatus関数の宣言
 */
export const manageCharacterStatusDeclaration: FunctionDeclaration = {
  name: 'manageCharacterStatus',
  description: 'キャラクターのステータス（HP, MPなど）を管理します。設定、増加、減少、取得の操作が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      characterName: {
        type: Type.STRING,
        description: '操作対象のキャラクター名',
      },
      action: {
        type: Type.STRING,
        description: '実行するアクション。「set」で設定、「increase」で増加、「decrease」で減少、「get」で取得',
        enum: ['set', 'increase', 'decrease', 'get'],
      },
      statusKey: {
        type: Type.STRING,
        description: '操作対象のステータス名（例: "HP", "MP", "ATK", "DEF"）',
      },
      value: {
        type: Type.NUMBER,
        description: 'set、increase、decreaseアクションで使用する数値',
      },
    },
    required: ['characterName', 'action', 'statusKey'],
  },
}
