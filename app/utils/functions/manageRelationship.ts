import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'

// 関係値の型定義
interface RelationshipValue {
  value: number
  lastUpdatedDay: number
}

// 関係値の構造の型定義
type RelationshipData = Record<string, Record<string, Record<string, RelationshipValue>>>

/**
 * キャラクター間の関係値（好感度、信頼度など）を多軸で管理する関数
 *
 * Gemini AIのFunction Calling機能を通じて、キャラクター間の関係値を
 * 多軸（好感度、信頼度、緊張度など）で管理します。関係値の設定、増減、
 * 取得、減衰機能を提供します。
 *
 * @async
 * @function manageRelationship
 * @param {FunctionCallArgs} args - Function Callingの引数
 * @param {string} args.sourceCharacter - 関係の主体となるキャラクター名
 * @param {string} [args.targetCharacter] - 関係の対象となるキャラクター名（一部のアクションで必須）
 * @param {string} [args.axis] - 操作する関係の軸（例: "好感度", "信頼度", "緊張度"）
 * @param {string} args.action - 実行するアクション（"set", "increase", "decrease", "get", "getAllAxes", "getAllFromSource"）
 * @param {number} [args.value] - "set", "increase", "decrease" アクションで使用する数値
 * @param {number} [args.clampMin] - 関係値の下限値
 * @param {number} [args.clampMax] - 関係値の上限値
 * @param {number} [args.daysToDecay] - 何日間更新がないと減衰が始まるか
 * @param {number} [args.decayValue] - 1日あたりに減衰する値（通常は負の数）
 * @param {FunctionExecutionContext} context - Function Callingの実行コンテキスト
 * @returns {Promise<object>} 操作結果を含むオブジェクト
 *   - `success`: 操作が成功したかどうか
 *   - `value` | `newValue`: 取得または設定された値
 *   - `relations`: 関係値のオブジェクト（複数取得時）
 *   - `message`: 操作結果の説明メッセージ
 *   - `error`: エラーメッセージ（エラー時）
 */
export async function manageRelationship(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{
  success?: boolean
  value?: number
  newValue?: number
  relations?: Record<string, unknown>
  message?: string
  error?: string
}> {
  console.log(`[Function Calling] manageRelationshipが呼び出されました。コンテキスト:`, context)

  const { sourceCharacter, targetCharacter, axis, action, value, clampMin, clampMax, daysToDecay, decayValue } = args

  if (!action || typeof action !== 'string') return { error: "引数 'action' は必須です。" }
  if (!sourceCharacter || typeof sourceCharacter !== 'string') return { error: "引数 'sourceCharacter' は必須です。" }

  // axis未指定時のデフォルト（好感度）
  const needsAxis = ['get', 'set', 'increase', 'decrease'].includes(action)
  const axisName = needsAxis ? axis || '好感度' : null

  // targetCharacter 必須チェック（getAllFromSource 以外）
  if (['get', 'set', 'increase', 'decrease', 'getAllAxes'].includes(action) && (!targetCharacter || typeof targetCharacter !== 'string')) {
    return { error: `アクション '${action}' には 'targetCharacter' が必須です。` }
  }

  // 軸必須の操作なのに最終的に軸が決まっていない場合
  if (needsAxis && !axisName) {
    return { error: `アクション '${action}' には 'axis' が必須です。` }
  }

  // 値が必要な操作
  if (['set', 'increase', 'decrease'].includes(action) && typeof value !== 'number') {
    return { error: `アクション '${action}' には数値型の 'value' が必要です。` }
  }

  try {
    if (!context.persistentMemory) context.persistentMemory = {}
    if (!context.persistentMemory.relationships) context.persistentMemory.relationships = {}
    if (typeof context.persistentMemory.gameDay !== 'number') context.persistentMemory.gameDay = 1

    const relationships = context.persistentMemory.relationships as RelationshipData
    const currentGameDay = context.persistentMemory.gameDay as number

    const calculateDecay = (currentValue: number, lastUpdatedDay: number): number => {
      if (typeof daysToDecay !== 'number' || typeof decayValue !== 'number') return currentValue
      const elapsedDays = currentGameDay - lastUpdatedDay
      if (elapsedDays > daysToDecay) {
        const decayDays = elapsedDays - daysToDecay
        const totalDecay = decayDays * decayValue
        return currentValue + totalDecay
      }
      return currentValue
    }

    const getRelation = (source: string, target: string, axisKey: string): RelationshipValue => {
      if (!relationships[source]) relationships[source] = {}
      if (!relationships[source][target]) relationships[source][target] = {}
      if (!relationships[source][target][axisKey]) {
        relationships[source][target][axisKey] = { value: 0, lastUpdatedDay: currentGameDay }
      }
      return relationships[source][target][axisKey]
    }

    let message = ''
    let resultData = {}

    switch (action) {
      case 'get': {
        const relation = getRelation(sourceCharacter, targetCharacter as string, axisName as string)
        const decayedValue = calculateDecay(relation.value, relation.lastUpdatedDay)
        message = `${sourceCharacter}から${targetCharacter}への${axisName}は現在 ${decayedValue} です。`
        resultData = { success: true, value: decayedValue, message }
        break
      }
      case 'set':
      case 'increase':
      case 'decrease': {
        const relation = getRelation(sourceCharacter, targetCharacter as string, axisName as string)
        const decayedBase = action === 'set' ? relation.value : calculateDecay(relation.value, relation.lastUpdatedDay)
        let newValue
        if (action === 'increase') newValue = decayedBase + (value as number)
        else if (action === 'decrease') newValue = decayedBase - (value as number)
        else newValue = value as number

        if (typeof clampMax === 'number') newValue = Math.min(newValue, clampMax)
        if (typeof clampMin === 'number') newValue = Math.max(newValue, clampMin)

        relation.value = newValue
        relation.lastUpdatedDay = currentGameDay

        message = `${sourceCharacter}から${targetCharacter}への${axisName}が更新され、${newValue}になりました。`
        resultData = { success: true, newValue: newValue, message }
        break
      }
      case 'getAllAxes': {
        if (!relationships[sourceCharacter] || !relationships[sourceCharacter][targetCharacter as string]) {
          return { success: true, relations: {}, message: `${sourceCharacter}から${targetCharacter}への関係はまだ設定されていません。` }
        }
        const targetRelations = relationships[sourceCharacter][targetCharacter as string]
        const allAxes: Record<string, number> = {}
        for (const axisKey in targetRelations) {
          const rel = targetRelations[axisKey]
          if (rel) {
            allAxes[axisKey] = calculateDecay(rel.value, rel.lastUpdatedDay)
          }
        }
        message = `${sourceCharacter}から${targetCharacter}への全関係軸を取得しました。`
        resultData = { success: true, relations: allAxes, message }
        break
      }
      case 'getAllFromSource': {
        if (!relationships[sourceCharacter]) {
          return { success: true, relations: {}, message: `${sourceCharacter}の人間関係はまだ設定されていません。` }
        }
        const sourceRelations = relationships[sourceCharacter]
        const allRelations: Record<string, Record<string, number>> = {}
        for (const targetName in sourceRelations) {
          allRelations[targetName] = {}
          for (const axisKey in sourceRelations[targetName]) {
            const rel = sourceRelations[targetName][axisKey]
            if (rel) {
              allRelations[targetName][axisKey] = calculateDecay(rel.value, rel.lastUpdatedDay)
            }
          }
        }
        message = `${sourceCharacter}が持つ全ての人間関係を取得しました。`
        resultData = { success: true, relations: allRelations, message }
        break
      }
      default:
        return { error: `無効なアクションです: ${action}` }
    }

    console.log(`[Function Calling] 処理完了:`, resultData)
    return resultData
  } catch (error) {
    console.error(`[Function Calling] manageRelationshipでエラーが発生しました:`, error)
    return { error: `内部エラーが発生しました: ${(error as Error).message}` }
  }
}

/**
 * manageRelationship関数のGemini AI Function Calling宣言
 *
 * Gemini AIのFunction Calling機能で使用するための関数宣言オブジェクトです。
 * この宣言により、Gemini AIがmanageRelationship関数を認識し、
 * 適切なタイミングで呼び出すことができます。
 *
 * @constant {FunctionDeclaration} manageRelationshipDeclaration
 * @property {string} name - 関数名（"manageRelationship"）
 * @property {string} description - 関数の説明文（Gemini AIが理解するための日本語説明）
 * @property {object} parameters - 関数のパラメータ定義
 * @property {Type} parameters.type - パラメータの型（OBJECT）
 * @property {object} parameters.properties - パラメータのプロパティ定義
 *
 */
export const manageRelationshipDeclaration: FunctionDeclaration = {
  name: 'manageRelationship',
  description: 'キャラクター間の関係値（好感度、信頼度など）を多軸で管理します。関係値の設定、増減、取得、減衰機能を提供します。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sourceCharacter: {
        type: Type.STRING,
        description: '関係の主体となるキャラクター名',
      },
      targetCharacter: {
        type: Type.STRING,
        description: '関係の対象となるキャラクター名（get, set, increase, decrease, getAllAxesアクションで必須、getAllFromSourceでは不要）',
      },
      axis: {
        type: Type.STRING,
        description: '操作する関係の軸（例: "好感度", "信頼度", "緊張度"）。get, set, increase, decreaseアクションで必須、getAllAxes, getAllFromSourceでは不要。未指定時は"好感度"がデフォルト',
      },
      action: {
        type: Type.STRING,
        description: '実行するアクション（"set", "increase", "decrease", "get", "getAllAxes", "getAllFromSource"）',
        enum: ['set', 'increase', 'decrease', 'get', 'getAllAxes', 'getAllFromSource'],
      },
      value: {
        type: Type.NUMBER,
        description: 'set, increase, decrease アクションで使用する数値（これらのアクションでは必須、get, getAllAxes, getAllFromSourceでは不要）',
      },
      clampMin: {
        type: Type.NUMBER,
        description: '関係値の下限値',
      },
      clampMax: {
        type: Type.NUMBER,
        description: '関係値の上限値',
      },
      daysToDecay: {
        type: Type.NUMBER,
        description: '何日間更新がないと減衰が始まるか',
      },
      decayValue: {
        type: Type.NUMBER,
        description: '1日あたりに減衰する値（通常は負の数）',
      },
    },
    required: ['sourceCharacter', 'action'],
  },
}
