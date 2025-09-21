/**
 * 現在のチャットセッションに紐づく永続メモリを管理する関数
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'

/**
 * 永続メモリ管理の結果型定義
 */
interface PersistentMemoryResult {
  success: boolean
  message?: string
  key?: string
  value?: unknown
  count?: number
  keys?: string[]
  error?: string
}

/**
 * 現在のチャットセッションに紐づく永続メモリを管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、チャットセッションの永続メモリを
 * 管理します。キーと値のペアを追加、取得、削除、一覧表示する機能を提供します。
 * 永続メモリはセッション間でデータを保持し、物語の進行状況や設定を記録できます。
 *
 * @async
 * @function managePersistentMemory
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.action - 実行するアクション（必須）
 *   - "add": キーと値のペアを永続メモリに追加
 *   - "get": 指定したキーの値を取得
 *   - "delete": 指定したキーを削除
 *   - "list": 全てのキーの一覧を取得
 * @param {string} [args.key] - 操作対象のキー
 *   actionが"add", "get", "delete"の場合は必須
 * @param {unknown} [args.value] - 保存する値
 *   actionが"add"の場合は必須
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<PersistentMemoryResult>} 操作結果を含むオブジェクト
 *   - `success`: 操作が成功したかどうか
 *   - `message`: 操作結果の説明メッセージ
 *   - `key`: 操作対象のキー（get、deleteアクション時）
 *   - `value`: 取得した値（getアクション時）
 *   - `count`: キーの総数（listアクション時）
 *   - `keys`: キーの配列（listアクション時）
 *   - `error`: エラーメッセージ（エラー時）
 *
 * @throws {Error} 必須引数が不足している場合
 * @throws {Error} 無効なアクションが指定された場合
 */
export async function managePersistentMemory(args: FunctionCallArgs, context: FunctionExecutionContext): Promise<PersistentMemoryResult> {
  logger.info(`[Function Calling] managePersistentMemoryが呼び出されました。コンテキスト:`, { component: 'managePersistentMemory' }, context)

  try {
    const { action, key, value } = args as {
      action: string
      key?: string
      value?: unknown
    }

    if (!action) {
      return {
        success: false,
        error: "引数 'action' は必須です。",
      }
    }

    // persistentMemoryの初期化
    if (!context.persistentMemory) {
      context.persistentMemory = {}
    }
    const memory = context.persistentMemory

    switch (action) {
      case 'add': {
        if (!key || value === undefined) {
          return {
            success: false,
            error: "addアクションには 'key' と 'value' が必要です。",
          }
        }
        memory[key] = value
        const result: PersistentMemoryResult = {
          success: true,
          message: `キー「${key}」に値を保存しました。`,
        }
        logger.info(`[Function Calling] managePersistentMemory: 処理完了:`, { component: 'managePersistentMemory' }, result)
        return result
      }

      case 'get': {
        if (!key) {
          return {
            success: false,
            error: "getアクションには 'key' が必要です。",
          }
        }
        const result: PersistentMemoryResult = key in memory ? { success: true, key, value: memory[key] } : { success: false, message: `キー「${key}」は見つかりませんでした。` }
        logger.info(`[Function Calling] managePersistentMemory: 処理完了:`, { component: 'managePersistentMemory' }, result)
        return result
      }

      case 'delete': {
        if (!key) {
          return {
            success: false,
            error: "deleteアクションには 'key' が必要です。",
          }
        }
        const result: PersistentMemoryResult =
          key in memory
            ? {
                success: true,
                message: `キー「${key}」を削除しました。`,
              }
            : {
                success: false,
                message: `キー「${key}」は見つかりませんでした。`,
              }

        if (key in memory) {
          // 動的プロパティの削除を避けるため、undefinedに設定
          memory[key] = undefined
        }

        logger.info(`[Function Calling] managePersistentMemory: 処理完了:`, { component: 'managePersistentMemory' }, result)
        return result
      }

      case 'list': {
        const keys = Object.keys(memory).filter((k) => memory[k] !== undefined)
        const result: PersistentMemoryResult = {
          success: true,
          count: keys.length,
          keys,
        }
        logger.info(`[Function Calling] managePersistentMemory: 処理完了:`, { component: 'managePersistentMemory' }, result)
        return result
      }

      default:
        return {
          success: false,
          error: `無効なアクションです: ${action}`,
        }
    }
  } catch (error) {
    logger.info(`[Function Calling] managePersistentMemoryでエラーが発生しました:`, { component: 'managePersistentMemory' }, error)
    return {
      success: false,
      error: `内部エラーが発生しました: ${(error as Error).message}`,
    }
  }
}

/**
 * managePersistentMemory関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanagePersistentMemory関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} managePersistentMemoryDeclaration
 * @property {string} name - 関数名（"managePersistentMemory"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {string[]} parameters.required - 必須パラメータの配列
 *
 */
export const managePersistentMemoryDeclaration: FunctionDeclaration = {
  name: 'managePersistentMemory',
  description: '現在のチャットセッションに紐づく永続メモリを管理します。キーと値のペアを追加、取得、削除、一覧表示が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: '実行するアクション。add（追加）、get（取得）、delete（削除）、list（一覧表示）のいずれか',
        enum: ['add', 'get', 'delete', 'list'],
      },
      key: {
        type: Type.STRING,
        description: '操作対象のキー（add、get、delete時に必須）',
      },
      value: {
        type: Type.STRING,
        description: '保存する値（add時に必須）。文字列、数値、真偽値など任意の型の値を文字列として保存',
      },
    },
    required: ['action'],
  },
}
