/**
 * キャラクターステータス関連のFunction Calling実装
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/lib/logger'

/**
 * キャラクターのステータス（HP, MPなど）を管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、キャラクターのステータス値を
 * 管理します。HP、MP、攻撃力、防御力などの数値ステータスの設定、増減、
 * 取得操作を提供します。永続メモリを使用してセッション間でデータを保持します。
 *
 * @async
 * @function manageCharacterStatus
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.characterName - 操作対象のキャラクター名（必須）
 * @param {string} args.action - 実行するアクション（必須）
 *   - "set": ステータス値を指定した値に設定
 *   - "increase": ステータス値を指定した値だけ増加
 *   - "decrease": ステータス値を指定した値だけ減少
 *   - "get": 現在のステータス値を取得
 * @param {string} args.statusKey - 操作対象のステータス名（必須）
 *   例: "HP", "MP", "ATK", "DEF", "SPD", "LUK" など
 * @param {number} [args.value] - set、increase、decreaseアクションで使用する数値
 *   actionが"set", "increase", "decrease"の場合は必須
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<object>} 操作結果を含むオブジェクト
 *   - `characterName`: 操作対象のキャラクター名
 *   - `statusKey`: 操作対象のステータス名
 *   - `action`: 実行されたアクション
 *   - `value`: 取得した値（getアクション時）
 *   - `oldValue`: 変更前の値（set、increase、decreaseアクション時）
 *   - `newValue`: 変更後の値（set、increase、decreaseアクション時）
 *   - `message`: 操作結果の説明メッセージ
 *
 * @throws {Error} 必須引数が不足している場合
 * @throws {Error} 無効なアクションが指定された場合
 * @throws {Error} 数値型のvalueが必要なアクションでvalueが数値でない場合
 */
export async function manageCharacterStatus(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<
  | {
      characterName: string
      statusKey: string
      action: string
      value?: number
      oldValue?: number
      newValue?: number
      message: string
    }
  | {
      error: string
    }
> {
  logger.info(`[Function Calling] manageCharacterStatusが呼び出されました。コンテキスト:`, { component: 'manageCharacterStatus' }, context)

  const characterName = args.characterName as string
  const action = args.action as string
  const statusKey = args.statusKey as string
  const value = args.value as number

  if (!characterName || !action || !statusKey) {
    const errorMsg = "引数 'characterName', 'action', 'statusKey' は必須です。"
    logger.info(`[Function Calling] manageCharacterStatus: ${errorMsg}`, { component: 'manageCharacterStatus' })
    return { error: errorMsg }
  }

  if (['set', 'increase', 'decrease'].includes(action) && typeof value !== 'number') {
    const errorMsg = `アクション '${action}' には数値型の 'value' が必要です。`
    logger.info(`[Function Calling] manageCharacterStatus: ${errorMsg}`, { component: 'manageCharacterStatus' })
    return { error: errorMsg }
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
        logger.info(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
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
        logger.info(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
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
        logger.info(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
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
        logger.info(`[Function Calling] manageCharacterStatus: 処理完了:`, result)
        return result
      }

      default:
        return { error: `無効なアクションです: ${action}` }
    }
  } catch (error) {
    logger.info(`[Function Calling] manageCharacterStatusでエラーが発生しました:`, { component: 'manageCharacterStatus' }, error)
    return { error: `キャラクターステータス操作中にエラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * manageCharacterStatus関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageCharacterStatus関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageCharacterStatusDeclaration
 * @property {string} name - 関数名（"manageCharacterStatus"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {string[]} parameters.required - 必須パラメータの配列
 *
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
