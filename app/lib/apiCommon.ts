import type { FunctionCall, FunctionCallResult, FunctionDeclaration } from '~/types/function-calling'
import { logger } from '~/utils/logger'

/**
 * API共通ユーティリティ関数
 *
 * Gemini、OpenAI、Claude APIの共通ロジックを提供
 */

/**
 * Function Call実行コンテキスト
 */
export interface FunctionExecutionContext {
  messageId?: string
  timestamp: number
  persistentMemory: Record<string, unknown>
}

/**
 * Function Call実行オプション
 */
export interface ExecuteFunctionCallsOptions {
  /** Function Call実行関数 */
  executeFunction: (call: FunctionCall, context: FunctionExecutionContext) => Promise<FunctionCallResult>
  /** 実行コンテキスト */
  context: FunctionExecutionContext
  /** ログ出力用のコンポーネント名 */
  componentName: string
  /** ストリーミングモードかどうか */
  isStreaming?: boolean
}

/**
 * Function Callを実行して結果を返す共通関数
 *
 * @param functionCalls - 実行するFunction Callの配列
 * @param options - 実行オプション
 * @returns Function Call結果の配列
 */
export const executeFunctionCallsCommon = async (functionCalls: FunctionCall[], options: ExecuteFunctionCallsOptions): Promise<FunctionCallResult[]> => {
  const { executeFunction, context, componentName, isStreaming = false } = options
  const mode = isStreaming ? 'ストリーミング' : '非ストリーミング'
  const functionResults: FunctionCallResult[] = []

  for (let i = 0; i < functionCalls.length; i++) {
    const functionCall = functionCalls[i]
    if (!functionCall) continue

    try {
      const result = await executeFunction(functionCall, context)
      functionResults.push(result)
    } catch (error) {
      logger.error(`[${mode}] 関数の実行に失敗 ${i + 1}/${functionCalls.length}:`, { component: componentName }, functionCall.name, error)

      const errorResult: FunctionCallResult = {
        name: functionCall.name,
        args: functionCall.args,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      }
      functionResults.push(errorResult)
    }
  }

  return functionResults
}

/**
 * allowedFunctionNamesに基づいて関数宣言をフィルタリング
 *
 * @param enabledFunctions - 有効な関数宣言の配列
 * @param allowedFunctionNames - 許可された関数名の配列
 * @param componentName - ログ出力用のコンポーネント名
 * @returns フィルタリングされた関数宣言の配列
 */
export const filterFunctionsByAllowedNames = (enabledFunctions: FunctionDeclaration[], allowedFunctionNames: string[] | undefined, componentName: string): FunctionDeclaration[] => {
  // allowedFunctionNamesが指定されていない場合はそのまま返す
  if (!allowedFunctionNames || allowedFunctionNames.length === 0) {
    return enabledFunctions
  }

  const allowedSet = new Set(allowedFunctionNames)
  const availableNames = new Set(enabledFunctions.map((declaration) => declaration.name).filter((name): name is string => typeof name === 'string'))

  // 未登録の関数名を警告
  const missingNames = allowedFunctionNames.filter((name) => !availableNames.has(name))
  if (missingNames.length > 0) {
    logger.warn('[関数呼び出し] allowedFunctionNamesに未登録の関数があります:', { component: componentName }, missingNames)
  }

  // フィルタリング実行
  const filteredFunctions = enabledFunctions.filter((declaration) => declaration.name && allowedSet.has(declaration.name))

  // フィルタリング結果をログ出力
  if (filteredFunctions.length !== enabledFunctions.length) {
    logger.info('[関数呼び出し] allowedFunctionNamesで関数をフィルタリングしました', {
      component: componentName,
      before: enabledFunctions.length,
      after: filteredFunctions.length,
      allowedFunctionNames,
    })
  }

  return filteredFunctions
}

/**
 * APIエラーメッセージを構築
 *
 * @param error - エラーオブジェクト
 * @param defaultMessage - デフォルトのエラーメッセージ
 * @param apiName - API名（例: "Gemini", "OpenAI", "Claude"）
 * @returns 構築されたエラーメッセージ
 */
export const buildApiErrorMessage = (error: unknown, defaultMessage: string, apiName?: string): string => {
  let errorMessage = defaultMessage

  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message)
  }

  if (!apiName) {
    return errorMessage
  }

  // 特定のエラータイプに基づく詳細メッセージ
  if (errorMessage.toLowerCase().includes('api key')) {
    return `${apiName} APIキーが無効または設定されていません`
  }
  if (errorMessage.toLowerCase().includes('quota')) {
    return `${apiName} APIの利用制限に達しました`
  }
  if (errorMessage.toLowerCase().includes('rate limit')) {
    return `${apiName} APIのレート制限に達しました`
  }

  return errorMessage
}

/**
 * Function CallとResultの数を検証
 *
 * @param functionCalls - Function Call配列
 * @param functionResults - Function Result配列
 * @param componentName - ログ出力用のコンポーネント名
 * @param mode - モード（"ストリーミング" or "非ストリーミング"）
 * @throws エラー - 数が一致しない場合
 */
export const validateFunctionCallResults = (functionCalls: FunctionCall[], functionResults: FunctionCallResult[], componentName: string, mode: string = '非ストリーミング'): void => {
  if (functionCalls.length !== functionResults.length) {
    const callNames = functionCalls.map((c) => c.name).join(', ')
    const resultNames = functionResults.map((r) => r.name).join(', ')

    logger.error(`[${mode}] Function CallとFunction Responseの数が一致しません`, {
      component: componentName,
      calls: functionCalls.length,
      results: functionResults.length,
      callNames,
      resultNames,
    })

    throw new Error(`Function CallとFunction Responseの数が一致しません: ${functionCalls.length} calls (${callNames}), ${functionResults.length} results (${resultNames})`)
  }
}

/**
 * Function Call処理完了ログを出力
 *
 * @param functionCalls - Function Call配列
 * @param functionResults - Function Result配列
 * @param componentName - ログ出力用のコンポーネント名
 * @param mode - モード（"ストリーミング" or "非ストリーミング"）
 */
export const logFunctionCallCompletion = (functionCalls: FunctionCall[], functionResults: FunctionCallResult[], componentName: string, mode: string = '非ストリーミング'): void => {
  logger.info(`[${mode}] Function Calling処理完了:`, {
    component: componentName,
    functionCallsCount: functionCalls.length,
    functionResultsCount: functionResults.length,
    functionCalls: functionCalls.map((fc) => ({ name: fc.name, args: fc.args })),
    functionResults: functionResults.map((fr) => ({ name: fr.name, hasResult: !!fr.result, hasError: !!fr.error })),
  })
}
