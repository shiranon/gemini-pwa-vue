/**
 * Function Calling 管理システム
 */

import { reactive, readonly, ref } from 'vue'
import type { FunctionCall, FunctionCallResult, FunctionDeclaration, FunctionExecutionContext, FunctionExecutionLog, FunctionHandler, FunctionRegistryEntry } from '~/types/function-calling'

import { getCurrentDateTime, getCurrentDateTimeDeclaration } from '~/utils/functions/datetime'

const functionRegistry = reactive<Map<string, FunctionRegistryEntry>>(new Map())

const executionLogs = ref<FunctionExecutionLog[]>([])

export const useFunctionCalling = () => {
  const registerFunction = (
    declaration: FunctionDeclaration,
    handler: FunctionHandler,
    options: {
      enabled?: boolean
      category?: string
      tags?: string[]
    } = {}
  ) => {
    const entry: FunctionRegistryEntry = {
      declaration,
      handler,
      enabled: options.enabled ?? true,
      category: options.category,
      tags: options.tags,
    }

    if (!declaration.name) {
      throw new Error('Function declaration must have a name')
    }
    functionRegistry.set(declaration.name, entry)
    console.log(`[Function Calling] 関数が登録されました: ${declaration.name}`)
  }

  /**
   * 関数の登録を解除する
   */
  const unregisterFunction = (name: string) => {
    const deleted = functionRegistry.delete(name)
    if (deleted) {
      console.log(`[Function Calling] 関数の登録が解除されました: ${name}`)
    }
    return deleted
  }

  /**
   * 関数を有効/無効にする
   */
  const toggleFunction = (name: string, enabled: boolean) => {
    const entry = functionRegistry.get(name)
    if (entry) {
      entry.enabled = enabled
      console.log(`[Function Calling] 関数が${enabled ? '有効' : '無効'}になりました: ${name}`)
    }
  }

  const getEnabledFunctionDeclarations = (): FunctionDeclaration[] => {
    return Array.from(functionRegistry.values())
      .filter((entry) => entry.enabled)
      .map((entry) => entry.declaration)
  }

  const executeFunction = async (functionCall: FunctionCall, context: FunctionExecutionContext): Promise<FunctionCallResult> => {
    const startTime = Date.now()
    const logId = `${functionCall.name}_${startTime}`

    try {
      console.log(`[Function Calling] 関数実行開始: ${functionCall.name}`, {
        args: functionCall.args,
        context,
      })

      // 関数がレジストリに存在するかチェック
      const entry = functionRegistry.get(functionCall.name)
      if (!entry) {
        throw new Error(`関数が見つかりません: ${functionCall.name}`)
      }

      // 関数が有効かチェック
      if (!entry.enabled) {
        throw new Error(`関数が無効化されています: ${functionCall.name}`)
      }

      // 関数を実行
      const result = await entry.handler(functionCall.args, context)
      const executionTime = Date.now() - startTime

      const callResult: FunctionCallResult = {
        name: functionCall.name,
        args: functionCall.args,
        result,
        executionTime,
      }

      // 実行ログを記録
      const log: FunctionExecutionLog = {
        id: logId,
        functionName: functionCall.name,
        args: functionCall.args,
        result,
        timestamp: startTime,
        executionTime,
        context,
      }
      executionLogs.value.unshift(log)

      // ログの上限管理（最新100件まで保持）
      if (executionLogs.value.length > 100) {
        executionLogs.value = executionLogs.value.slice(0, 100)
      }

      console.log(`[Function Calling] 関数実行完了: ${functionCall.name}`, {
        result,
        executionTime: `${executionTime}ms`,
      })

      return callResult
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      const callResult: FunctionCallResult = {
        name: functionCall.name,
        args: functionCall.args,
        result: null,
        error: errorMessage,
        executionTime,
      }

      // エラーログを記録
      const log: FunctionExecutionLog = {
        id: logId,
        functionName: functionCall.name,
        args: functionCall.args,
        result: null,
        error: errorMessage,
        timestamp: startTime,
        executionTime,
        context,
      }
      executionLogs.value.unshift(log)

      console.error(`[Function Calling] 関数実行エラー: ${functionCall.name}`, {
        error: errorMessage,
        executionTime: `${executionTime}ms`,
      })

      return callResult
    }
  }

  const executeFunctions = async (functionCalls: FunctionCall[], context: FunctionExecutionContext): Promise<FunctionCallResult[]> => {
    const promises = functionCalls.map((call) => executeFunction(call, context))
    return Promise.all(promises)
  }

  const clearExecutionLogs = () => {
    executionLogs.value = []
    console.log('[Function Calling] 実行ログがクリアされました')
  }

  /**
   * デフォルト関数を初期化する
   */
  const initializeDefaultFunctions = () => {
    // 現在時刻取得関数を登録
    registerFunction(getCurrentDateTimeDeclaration, getCurrentDateTime, {
      category: 'datetime',
      tags: ['time', 'date', 'jst'],
    })

    console.log('[Function Calling] デフォルト関数が初期化されました')
  }

  /**
   * 関数レジストリの統計情報を取得する
   */
  const getRegistryStats = () => {
    const totalFunctions = functionRegistry.size
    const enabledFunctions = Array.from(functionRegistry.values()).filter((entry) => entry.enabled).length
    const categories = new Set(
      Array.from(functionRegistry.values())
        .map((entry) => entry.category)
        .filter(Boolean)
    )

    return {
      totalFunctions,
      enabledFunctions,
      disabledFunctions: totalFunctions - enabledFunctions,
      categories: Array.from(categories),
    }
  }

  // 初期化時にデフォルト関数を登録
  if (functionRegistry.size === 0) {
    initializeDefaultFunctions()
  }

  return {
    functionRegistry: readonly(functionRegistry),
    executionLogs: readonly(executionLogs),

    registerFunction,
    unregisterFunction,
    toggleFunction,
    getEnabledFunctionDeclarations,

    executeFunction,
    executeFunctions,

    clearExecutionLogs,
    initializeDefaultFunctions,
    getRegistryStats,
  }
}

export type UseFunctionCallingReturn = ReturnType<typeof useFunctionCalling>
