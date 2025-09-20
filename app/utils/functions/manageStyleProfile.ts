import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

/**
 * スタイルプロファイルの型定義
 */
interface StyleProfile {
  firstPerson?: string | null
  politeness?: number
  sentenceEnder?: string
  dialect?: string
  description?: string
  profileName?: string
}

/**
 * スタイルプロファイルのプリセット型定義
 */
interface StylePresets {
  [key: string]: StyleProfile
}

/**
 * キャラクターの口調や一人称などのスタイルプロファイルを管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、キャラクターの口調プロファイルを
 * 設定・取得・一覧表示します。定義済みプリセットの適用やカスタム設定の
 * 上書きが可能です。
 *
 * @async
 * @function manageStyleProfile
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.action - 実行するアクション（"set", "get", "list"）
 * @param {string} [args.characterName] - 操作対象のキャラクター名（set/getアクションで必須）
 * @param {string} [args.profileName] - 適用する定義済みプリセット名（setアクションで使用）
 * @param {object} [args.overrides] - プリセットの一部を上書きする設定（setアクションで使用）
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<object>} 操作結果を含むオブジェクト
 *   - `success`: 操作の成功可否（boolean）
 *   - `message`: 操作結果のメッセージ（string）
 *   - `profile`: 取得・設定されたプロファイル情報（object、get/setアクション時）
 *   - `availablePresets`: 利用可能なプリセット一覧（object、listアクション時）
 *   - `error`: エラーメッセージ（string、エラー時）
 */
export async function manageStyleProfile(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  success?: boolean
  message?: string
  profile?: object
  availablePresets?: object
  error?: string
}> {
  const { action, characterName, profileName, overrides } = args
  console.log(`[Function Calling] manageStyleProfileが呼び出されました。`, { action, characterName, profileName, overrides })
  const STYLE_PRESETS: StylePresets = {
    polite: { firstPerson: '私', politeness: 0.8, sentenceEnder: 'です,ます', dialect: 'standard', description: '丁寧語' },
    casual: { firstPerson: '俺', politeness: 0.3, sentenceEnder: 'だ,だよ', dialect: 'standard', description: 'カジュアル' },
    tsundere: { firstPerson: 'アタシ', politeness: 0.6, sentenceEnder: 'なんだからね！', dialect: 'standard', description: 'ツンデレ' },
    merchant: { firstPerson: 'あっし', politeness: 0.7, sentenceEnder: 'でさぁ,まっせ', dialect: 'merchantSpeak', description: '商人' },
    nobleMale: { firstPerson: '私', politeness: 0.9, sentenceEnder: 'である,かね', dialect: 'noble', description: '貴族男性' },
    nobleFemale: { firstPerson: 'わたくし', politeness: 0.9, sentenceEnder: 'ですわ,ますのよ', dialect: 'noble', description: '貴族女性（お嬢様）' },
    samurai: { firstPerson: '拙者', politeness: 0.7, sentenceEnder: 'である,ござる', dialect: 'samurai', description: '武士' },
    ninja: { firstPerson: 'アテ', politeness: 0.7, sentenceEnder: 'である,ござる', dialect: 'samurai', description: '忍者' },
    kansai: { firstPerson: 'ウチ', politeness: 0.4, sentenceEnder: 'やで,やんか', dialect: 'kansai', description: '関西弁' },
    neutralNarration: { firstPerson: null, politeness: 0.5, sentenceEnder: 'だ,である', dialect: 'standard', description: '地の文（三人称中立）' },
  }

  if (!action) {
    return { error: "引数 'action' は必須です。" }
  }
  if (['set', 'get'].includes(action as string) && !characterName) {
    return { error: `アクション '${action}' には 'characterName' が必須です。` }
  }

  try {
    if (!context.persistentMemory) {
      context.persistentMemory = {}
    }
    if (!context.persistentMemory.styleProfiles) {
      context.persistentMemory.styleProfiles = {}
    }
    const profiles = context.persistentMemory.styleProfiles as Record<string, StyleProfile>
    switch (action) {
      case 'set': {
        let baseProfile: StyleProfile = {}
        if (profileName) {
          if (!STYLE_PRESETS[profileName as keyof typeof STYLE_PRESETS]) {
            return { error: `指定されたプリセット名 '${profileName}' は存在しません。` }
          }
          baseProfile = { ...STYLE_PRESETS[profileName as keyof typeof STYLE_PRESETS] }
        } else {
          baseProfile = profiles[characterName as string] ? { ...profiles[characterName as string] } : {}
        }
        const finalProfile: StyleProfile = {
          ...baseProfile,
          ...(overrides as StyleProfile),
        }
        profiles[characterName as string] = finalProfile
        console.log(`[Function Calling] manageStyleProfile: ${characterName}のプロファイルを設定しました:`, finalProfile)
        return { success: true, message: `${characterName}の口調プロファイルを更新しました。`, profile: finalProfile }
      }
      case 'get': {
        const profile = profiles[characterName as string]
        if (!profile) {
          return { success: false, message: `${characterName}の口調プロファイルは設定されていません。` }
        }
        console.log(`[Function Calling] manageStyleProfile: ${characterName}のプロファイルを取得しました:`, profile)
        return { success: true, profile: profile }
      }
      case 'list': {
        console.log(`[Function Calling] manageStyleProfile: 利用可能なプリセット一覧を取得しました`)
        return { success: true, availablePresets: STYLE_PRESETS }
      }
      default:
        return { error: `無効なアクションです: ${action}` }
    }
  } catch (error) {
    console.error(`[Function Calling] manageStyleProfileでエラーが発生しました:`, error)
    throw new Error(`スタイルプロファイルの管理中にエラーが発生しました: ${(error as Error).message}`)
  }
}

/**
 * manageStyleProfile関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageStyleProfile関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageStyleProfileDeclaration
 * @property {string} name - 関数名（"manageStyleProfile"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 * @property {object} parameters.properties.action - 実行するアクション（必須）
 * @property {object} parameters.properties.characterName - キャラクター名（set/getアクションで必須）
 * @property {object} parameters.properties.profileName - プリセット名（setアクションで使用）
 * @property {object} parameters.properties.overrides - 上書き設定（setアクションで使用）
 *
 */
export const manageStyleProfileDeclaration: FunctionDeclaration = {
  name: 'manageStyleProfile',
  description: 'キャラクターの口調や一人称などのスタイルプロファイルを管理します。定義済みプリセットの適用、カスタム設定の上書き、プロファイルの取得、利用可能なプリセット一覧の表示が可能です。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: '実行するアクション（"set": プロファイル設定, "get": プロファイル取得, "list": プリセット一覧表示）',
        enum: ['set', 'get', 'list'],
      },
      characterName: {
        type: Type.STRING,
        description: '操作対象のキャラクター名（set/getアクションで必須）',
      },
      profileName: {
        type: Type.STRING,
        description: '適用する定義済みプリセット名（setアクションで使用。polite, casual, tsundere, merchant, nobleMale, nobleFemale, samurai, ninja, kansai, neutralNarration から選択）',
        enum: ['polite', 'casual', 'tsundere', 'merchant', 'nobleMale', 'nobleFemale', 'samurai', 'ninja', 'kansai', 'neutralNarration'],
      },
      overrides: {
        type: Type.OBJECT,
        description: 'プリセットの一部を上書きする設定（setアクションで使用。firstPerson, politeness, sentenceEnder, dialect, description を指定可能）',
        properties: {
          firstPerson: {
            type: Type.STRING,
            description: '一人称（例: "私", "俺", "アタシ"）',
          },
          politeness: {
            type: Type.NUMBER,
            description: '丁寧度（0.0-1.0の数値）',
            minimum: 0,
            maximum: 1,
          },
          sentenceEnder: {
            type: Type.STRING,
            description: '文末表現（例: "です,ます", "だ,だよ"）',
          },
          dialect: {
            type: Type.STRING,
            description: '方言・話し方（standard, merchantSpeak, noble, samurai, kansai など）',
          },
          description: {
            type: Type.STRING,
            description: 'プロファイルの説明',
          },
        },
      },
    },
    required: ['action'],
  },
}
