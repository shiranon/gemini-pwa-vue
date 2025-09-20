/**
 * 物語のフラグやカウンターを管理する関数
 */
import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

/**
 * 物語のフラグやカウンターを管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、物語のフラグやカウンターを
 * 管理します。フラグの設定・取得・切り替え、カウンターの増減、削除機能を
 * 提供します。永続メモリを使用してセッション間でデータを保持し、
 * 物語の進行状況や状態を記録できます。
 *
 * @async
 * @function manageFlags
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.action - 実行するアクション（必須）
 *   - "set": フラグを指定した値に設定
 *   - "get": フラグの現在の値を取得
 *   - "toggle": フラグの真偽値を切り替え（true ↔ false）
 *   - "increase": カウンターを指定した値だけ増加
 *   - "decrease": カウンターを指定した値だけ減少
 *   - "delete": フラグを削除
 * @param {string} args.key - フラグを識別するための一意のキー（必須）
 * @param {unknown} [args.value] - 設定・増減する値
 *   actionが"set", "increase", "decrease"の場合は必須
 *   increase/decreaseの場合は数値である必要があります
 * @param {number} [args.ttlMinutes] - フラグが自動的に消滅するまでの時間（分単位）
 *   省略可能。指定した場合、指定時間後にフラグが自動削除されます
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<object>} 操作結果を含むオブジェクト
 *   - `success`: 操作が成功したかどうか
 *   - `key`: 操作対象のキー
 *   - `oldValue`: 変更前の値（set、increase、decrease、toggleアクション時）
 *   - `newValue`: 変更後の値（set、increase、decrease、toggleアクション時）
 *   - `message`: 操作結果の説明メッセージ
 *   - `error`: エラーメッセージ（エラー時）
 *
 * @throws {Error} 必須引数が不足している場合
 * @throws {Error} 無効なアクションが指定された場合
 * @throws {Error} 数値型のvalueが必要なアクションでvalueが数値でない場合
 */
export async function manageFlags(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  success: boolean
  key: string
  oldValue?: unknown
  newValue?: unknown
  message: string
  error?: string
}> {
  console.log(`[Function Calling] manageFlagsが呼び出されました。コンテキスト:`, context)

  try {
    const { action, key, value, ttlMinutes } = args
    const keyStr = key as string
    const actionStr = action as string

    if (!keyStr || !actionStr) {
      return {
        success: false,
        key: keyStr || '',
        message: "引数 'key' と 'action' は必須です。",
        error: "引数 'key' と 'action' は必須です。",
      }
    }

    if (!context.persistentMemory) {
      context.persistentMemory = {}
    }
    const memory = context.persistentMemory
    let currentValue = memory[keyStr]
    let newValue: unknown
    let message: string

    switch (actionStr) {
      case 'set':
        if (value === undefined) {
          return {
            success: false,
            key: keyStr,
            message: "アクション 'set' には 'value' が必要です。",
            error: "アクション 'set' には 'value' が必要です。",
          }
        }
        newValue = value
        message = `フラグ「${keyStr}」を「${newValue}」に設定しました。`
        break
      case 'get':
        message = currentValue !== undefined ? `フラグ「${keyStr}」の現在の値は「${currentValue}」です。` : `フラグ「${keyStr}」は設定されていません。`
        return { success: true, key: keyStr, oldValue: currentValue, newValue: currentValue, message }
      case 'toggle':
        newValue = !(currentValue === true)
        message = `フラグ「${keyStr}」を「${newValue}」に切り替えました。`
        break
      case 'increase':
        if (typeof value !== 'number') {
          return {
            success: false,
            key: keyStr,
            message: "アクション 'increase' には数値型の 'value' が必要です。",
            error: "アクション 'increase' には数値型の 'value' が必要です。",
          }
        }
        currentValue = typeof currentValue === 'number' ? currentValue : 0
        newValue = (currentValue as number) + value
        message = `カウンター「${keyStr}」が${value}増加し、「${newValue}」になりました。`
        break
      case 'decrease':
        if (typeof value !== 'number') {
          return {
            success: false,
            key: keyStr,
            message: "アクション 'decrease' には数値型の 'value' が必要です。",
            error: "アクション 'decrease' には数値型の 'value' が必要です。",
          }
        }
        currentValue = typeof currentValue === 'number' ? currentValue : 0
        newValue = (currentValue as number) - value
        message = `カウンター「${keyStr}」が${value}減少し、「${newValue}」になりました。`
        break
      case 'delete':
        if (keyStr in memory) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete memory[keyStr]
          message = `フラグ「${keyStr}」を削除しました。`
        } else {
          return { success: false, key: keyStr, message: `フラグ「${keyStr}」は存在しません。` }
        }
        break
      default:
        return {
          success: false,
          key: keyStr,
          message: `無効なアクションです: ${actionStr}`,
          error: `無効なアクションです: ${actionStr}`,
        }
    }

    if (newValue !== undefined) {
      memory[keyStr] = newValue
    }

    if (typeof ttlMinutes === 'number' && ttlMinutes > 0) {
      // TTLの処理はDB保存と分離するため、ここではメッセージ追加のみ
      message += ` (${ttlMinutes}分後に自動消滅します)`
    }

    const result = {
      success: true,
      key: keyStr,
      oldValue: currentValue,
      newValue,
      message,
    }

    console.log(`[Function Calling] manageFlags: 処理完了:`, result)
    return result
  } catch (error) {
    console.error(`[Function Calling] manageFlagsでエラーが発生しました:`, error)
    return {
      success: false,
      key: (args.key as string) || '',
      message: `内部エラーが発生しました: ${(error as Error).message}`,
      error: `内部エラーが発生しました: ${(error as Error).message}`,
    }
  }
}

/**
 * manageFlags関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageFlags関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageFlagsDeclaration
 * @property {string} name - 関数名（"manageFlags"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {string[]} parameters.required - 必須パラメータの配列
 *
 */
export const manageFlagsDeclaration: FunctionDeclaration = {
  name: 'manageFlags',
  description: '物語のフラグやカウンターを管理します。フラグの設定・取得・切り替え、カウンターの増減、削除が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: '実行するアクション。set（設定）、get（取得）、toggle（切り替え）、increase（増加）、decrease（減少）、delete（削除）のいずれか',
        enum: ['set', 'get', 'toggle', 'increase', 'decrease', 'delete'],
      },
      key: {
        type: Type.STRING,
        description: 'フラグを識別するための一意のキー',
      },
      value: {
        type: Type.STRING,
        description: 'set、increase、decreaseで使用する値。setの場合は任意の型、increase/decreaseの場合は数値である必要があります',
      },
      ttlMinutes: {
        type: Type.NUMBER,
        description: 'フラグが自動的に消滅するまでの時間（分単位）。省略可能',
      },
    },
    required: ['action', 'key'],
  },
}
