/**
 * 物語のシーン（場所、時間、雰囲気など）を管理する関数
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/utils/logger'

/**
 * シーン情報の型定義
 */
interface SceneInfo {
  sceneId?: string
  location?: string
  timeOfDay?: string
  mood?: string
  pov?: string
  notes?: string
}

/**
 * シーン管理の結果型定義
 */
interface SceneManagementResult {
  success: boolean
  currentScene: SceneInfo
  message: string
  error?: string
}

/**
 * 物語のシーン（場所、時間、雰囲気など）を管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、物語のシーン情報を管理します。
 * 場所、時間帯、雰囲気、視点などの情報を設定・取得し、シーンの履歴を
 * スタック形式で管理できます。新しいシーンへの移行や前のシーンへの
 * 戻り機能も提供します。
 *
 * @async
 * @function manageScene
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.action - 実行するアクション（必須）
 *   - "get": 現在のシーン情報を取得
 *   - "set": 現在のシーンの情報を更新
 *   - "push": 新しいシーンに移行（シーンスタックに追加）
 *   - "pop": 前のシーンに戻る（シーンスタックから削除）
 * @param {string} [args.sceneId] - シーンを識別するための一意のID
 * @param {string} [args.location] - 場所名
 * @param {string} [args.timeOfDay] - 時間帯
 *   指定可能な値: "morning", "noon", "evening", "night"
 * @param {string} [args.mood] - 雰囲気
 *   指定可能な値: "sweet", "calm", "tense", "dark", "mysterious", "romantic", "action", "dramatic"
 * @param {string} [args.pov] - 視点
 *   指定可能な値: "first", "third"
 * @param {string} [args.notes] - その他のメモや詳細情報
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<SceneManagementResult>} 操作結果を含むオブジェクト
 *   - `success`: 操作が成功したかどうか
 *   - `currentScene`: 現在のシーン情報
 *   - `message`: 操作結果の説明メッセージ
 *   - `error`: エラーメッセージ（エラー時）
 *
 * @throws {Error} 必須引数が不足している場合
 * @throws {Error} 無効なアクションが指定された場合
 * @throws {Error} これ以上前のシーンに戻れない場合（popアクション時）
 */
export async function manageScene(args: FunctionCallArgs, context: FunctionExecutionContext): Promise<SceneManagementResult> {
  logger.info(`[Function Calling] manageSceneが呼び出されました。コンテキスト:`, { component: 'manageScene' }, context)

  try {
    const { action, ...sceneDetails } = args as {
      action: string
      sceneId?: string
      location?: string
      timeOfDay?: string
      mood?: string
      pov?: string
      notes?: string
    }

    if (!action) {
      return {
        success: false,
        currentScene: { sceneId: 'initial', location: '不明な場所' },
        message: '',
        error: "引数 'action' は必須です。",
      }
    }

    // persistentMemoryの初期化
    if (!context.persistentMemory) {
      context.persistentMemory = {}
    }
    if (!Array.isArray(context.persistentMemory.sceneStack)) {
      context.persistentMemory.sceneStack = [{ sceneId: 'initial', location: '不明な場所' }]
    }

    const sceneStack = context.persistentMemory.sceneStack as SceneInfo[]
    let message: string
    let currentScene = sceneStack[sceneStack.length - 1]!

    switch (action) {
      case 'get': {
        message = `現在のシーン情報を取得しました。`
        const getResult: SceneManagementResult = {
          success: true,
          currentScene: currentScene,
          message,
        }
        logger.info(`[Function Calling] manageScene: 取得結果:`, { component: 'manageScene' }, getResult)
        return getResult
      }

      case 'set': {
        Object.keys(sceneDetails).forEach((key) => {
          if (sceneDetails[key as keyof typeof sceneDetails] !== undefined) {
            currentScene[key as keyof SceneInfo] = sceneDetails[key as keyof typeof sceneDetails]
          }
        })
        message = `シーン情報を更新しました。現在の場所: ${currentScene.location || '未設定'}`
        break
      }

      case 'push': {
        const newScene: SceneInfo = { ...currentScene, ...sceneDetails }
        sceneStack.push(newScene)
        message = `新しいシーン「${newScene.location || '新しい場所'}」に移行しました。`
        break
      }

      case 'pop': {
        if (sceneStack.length <= 1) {
          return {
            success: false,
            currentScene: currentScene,
            message: '',
            error: 'これ以上前のシーンに戻ることはできません。',
          }
        }
        const poppedScene = sceneStack.pop()!
        currentScene = sceneStack[sceneStack.length - 1]!
        message = `シーン「${poppedScene.location || '前の場所'}」から「${currentScene.location || '現在の場所'}」に戻りました。`
        break
      }

      default:
        return {
          success: false,
          currentScene: currentScene,
          message: '',
          error: `無効なアクションです: ${action}`,
        }
    }

    const finalCurrentScene = sceneStack[sceneStack.length - 1]!
    const result: SceneManagementResult = {
      success: true,
      currentScene: finalCurrentScene,
      message,
    }

    logger.info(`[Function Calling] manageScene: 処理完了:`, { component: 'manageScene' }, result)
    return result
  } catch (error) {
    logger.info(`[Function Calling] manageSceneでエラーが発生しました:`, { component: 'manageScene' }, error)
    return {
      success: false,
      currentScene: { sceneId: 'initial', location: '不明な場所' },
      message: '',
      error: `内部エラーが発生しました: ${(error as Error).message}`,
    }
  }
}

/**
 * manageScene関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageScene関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageSceneDeclaration
 * @property {string} name - 関数名（"manageScene"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {string[]} parameters.required - 必須パラメータの配列
 *
 */
export const manageSceneDeclaration: FunctionDeclaration = {
  name: 'manageScene',
  description: '物語のシーン（場所、時間、雰囲気など）を管理します。シーンの設定、取得、新しいシーンへの移行、前のシーンへの戻りが可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: '実行するアクション。get（取得）、set（設定）、push（新しいシーンに移行）、pop（前のシーンに戻る）のいずれか',
        enum: ['get', 'set', 'push', 'pop'],
      },
      sceneId: {
        type: Type.STRING,
        description: 'シーンを識別するための一意のID',
      },
      location: {
        type: Type.STRING,
        description: '場所名',
      },
      timeOfDay: {
        type: Type.STRING,
        description: '時間帯',
        enum: ['morning', 'noon', 'evening', 'night'],
      },
      mood: {
        type: Type.STRING,
        description: '雰囲気',
        enum: ['sweet', 'calm', 'tense', 'dark', 'mysterious', 'romantic', 'action', 'dramatic'],
      },
      pov: {
        type: Type.STRING,
        description: '視点',
        enum: ['first', 'third'],
      },
      notes: {
        type: Type.STRING,
        description: 'その他のメモや詳細情報',
      },
    },
    required: ['action'],
  },
}
