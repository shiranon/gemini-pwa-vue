/**
 * Function Calling 管理システム
 */

import { reactive, readonly, ref } from 'vue'
import type {
  FunctionArgsPreparer,
  FunctionArgsValidator,
  FunctionCall,
  FunctionCallArgs,
  FunctionCallResult,
  FunctionDeclaration,
  FunctionExecutionContext,
  FunctionExecutionContextEnhancer,
  FunctionExecutionLog,
  FunctionHandler,
  FunctionRegistryEntry,
  FunctionToolDefinition,
  FunctionToolMeta,
} from '~/types/function-calling'

import { logger } from '~/utils/logger'
import { createManageBackgroundDefinition, functionToolDefinitions } from '~/utils/registry'

const functionRegistry = reactive<Map<string, FunctionRegistryEntry>>(new Map())

const executionLogs = ref<FunctionExecutionLog[]>([])

interface RegisterFunctionOptions {
  enabled?: boolean
  meta?: FunctionToolMeta
  category?: string
  tags?: string[]
  prepareArgs?: FunctionArgsPreparer
  validateArgs?: FunctionArgsValidator
  enhanceExecutionContext?: FunctionExecutionContextEnhancer
}

export const useFunctionCalling = () => {
  const registerFunction = (declaration: FunctionDeclaration, handler: FunctionHandler, options: RegisterFunctionOptions = {}) => {
    if (!declaration.name) {
      throw new Error('Function declaration must have a name')
    }

    const name = declaration.name
    const existingEntry = functionRegistry.get(name)

    const meta: FunctionToolMeta = {
      ...(options.meta ? { ...options.meta } : {}),
      id: options.meta?.id ?? name,
      displayName: options.meta?.displayName ?? name,
      description: options.meta?.description ?? declaration.description,
      category: options.meta?.category ?? options.category,
      tags: options.meta?.tags ?? options.tags,
      defaultEnabled: options.meta?.defaultEnabled,
      docsUrl: options.meta?.docsUrl,
      argsHint: options.meta?.argsHint,
      contextHint: options.meta?.contextHint,
    }

    const resolvedEnabled = options.enabled ?? existingEntry?.enabled ?? meta.defaultEnabled ?? true

    const entry: FunctionRegistryEntry = {
      declaration,
      handler,
      enabled: resolvedEnabled,
      meta,
      prepareArgs: options.prepareArgs,
      validateArgs: options.validateArgs,
      enhanceExecutionContext: options.enhanceExecutionContext,
    }

    functionRegistry.set(name, entry)

    logger.info(`[Function Calling] 関数が${existingEntry ? '更新' : '登録'}されました: ${name}`, { component: 'useFunctionCalling' })
  }

  const registerFunctionDefinition = (definition: FunctionToolDefinition, overrides: { enabled?: boolean } = {}) => {
    const name = definition.declaration.name
    if (!name) {
      throw new Error('Function definition must have a name')
    }
    registerFunction(definition.declaration, definition.handler, {
      enabled: overrides.enabled ?? definition.meta?.defaultEnabled,
      meta: definition.meta,
      prepareArgs: definition.prepareArgs,
      validateArgs: definition.validateArgs,
      enhanceExecutionContext: definition.enhanceExecutionContext,
    })
  }

  /**
   * 関数の登録を解除する
   */
  const unregisterFunction = (name: string) => {
    const deleted = functionRegistry.delete(name)
    if (deleted) {
      logger.info(`[Function Calling] 関数の登録が解除されました: ${name}`, { component: 'useFunctionCalling' })
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
      logger.info(`[Function Calling] 関数が${enabled ? '有効' : '無効'}になりました: ${name}`, { component: 'useFunctionCalling' })
    }
  }

  /**
   * 指定された関数名リストで有効化状態を一括更新する
   */
  const setFunctionEnablement = (enabledFunctionNames: readonly string[]) => {
    const enabledSet = new Set(enabledFunctionNames)
    enabledSet.forEach((name) => {
      if (!functionRegistry.has(name)) {
        logger.warn(`[Function Calling] 有効化対象の関数が見つかりません: ${name}`, { component: 'useFunctionCalling' })
      }
    })
    functionRegistry.forEach((entry, name) => {
      const nextEnabled = enabledSet.has(name)
      if (entry.enabled !== nextEnabled) {
        entry.enabled = nextEnabled
        logger.info(`[Function Calling] 関数が${nextEnabled ? '有効' : '無効'}になりました: ${name}`, { component: 'useFunctionCalling' })
      }
    })
  }

  const getEnabledFunctionDeclarations = (): FunctionDeclaration[] => {
    return Array.from(functionRegistry.values())
      .filter((entry) => entry.enabled)
      .map((entry) => entry.declaration)
  }

  const getEnabledFunctionNames = (): string[] => {
    return Array.from(functionRegistry.entries())
      .filter(([, entry]) => entry.enabled)
      .map(([name]) => name)
  }

  const getFunctionRegistryEntries = () => {
    return Array.from(functionRegistry.entries()).map(([name, entry]) => ({
      name,
      entry,
    }))
  }

  /**
   * manageBackground関数のFunction Declarationを再生成・更新する
   * 背景画像の追加・削除時に呼び出す
   */
  const refreshManageBackgroundDeclaration = async () => {
    try {
      logger.info('[Function Calling] manageBackground関数のDeclarationを更新します', { component: 'useFunctionCalling' })
      const manageBackgroundDef = await createManageBackgroundDefinition()
      registerFunctionDefinition(manageBackgroundDef, { enabled: functionRegistry.get('manageBackground')?.enabled })
      logger.info('[Function Calling] manageBackground関数のDeclarationを更新しました', { component: 'useFunctionCalling' })
    } catch (error) {
      logger.error('[Function Calling] manageBackground関数のDeclaration更新に失敗しました', { component: 'useFunctionCalling' }, error)
      throw error
    }
  }

  const executeFunction = async (functionCall: FunctionCall, context: FunctionExecutionContext): Promise<FunctionCallResult> => {
    const startTime = Date.now()
    const logId = `${functionCall.name}_${startTime}`
    let effectiveArgs: FunctionCallArgs = functionCall.args
    let effectiveContext: FunctionExecutionContext = context

    try {
      logger.info(`[Function Calling] 関数実行開始: ${functionCall.name}`, {
        args: functionCall.args,
        context,
        component: 'useFunctionCalling',
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

      effectiveArgs = entry.prepareArgs ? await entry.prepareArgs(functionCall.args) : functionCall.args
      if (entry.validateArgs) {
        entry.validateArgs(effectiveArgs)
      }
      effectiveContext = entry.enhanceExecutionContext ? entry.enhanceExecutionContext(context) : context

      // 関数を実行
      const result = await entry.handler(effectiveArgs, effectiveContext)
      const executionTime = Date.now() - startTime

      const callResult: FunctionCallResult = {
        name: functionCall.name,
        args: effectiveArgs,
        result,
        executionTime,
        context: effectiveContext,
      }

      // 実行ログを記録
      const log: FunctionExecutionLog = {
        id: logId,
        functionName: functionCall.name,
        args: effectiveArgs,
        result,
        timestamp: startTime,
        executionTime,
        context: effectiveContext,
      }
      executionLogs.value.unshift(log)

      // ログの上限管理（最新100件まで保持）
      if (executionLogs.value.length > 100) {
        executionLogs.value = executionLogs.value.slice(0, 100)
      }

      logger.info(`[Function Calling] 関数実行完了: ${functionCall.name}`, {
        result,
        executionTime: `${executionTime}ms`,
        component: 'useFunctionCalling',
      })

      return callResult
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      const callResult: FunctionCallResult = {
        name: functionCall.name,
        args: effectiveArgs,
        result: null,
        error: errorMessage,
        executionTime,
        context: effectiveContext,
      }

      // エラーログを記録
      const log: FunctionExecutionLog = {
        id: logId,
        functionName: functionCall.name,
        args: effectiveArgs,
        result: null,
        error: errorMessage,
        timestamp: startTime,
        executionTime,
        context: effectiveContext,
      }
      executionLogs.value.unshift(log)

      logger.error(`[Function Calling] 関数実行エラー: ${functionCall.name}`, {
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
    logger.info('[Function Calling] 実行ログがクリアされました', { component: 'useFunctionCalling' })
  }

  /**
   * デフォルト関数を初期化する
   */
  const initializeDefaultFunctions = async (definitions: FunctionToolDefinition[] = functionToolDefinitions) => {
    // 通常の関数を登録
    definitions.forEach((definition) => {
      const name = definition.declaration.name
      if (!name) {
        logger.warn('[Function Calling] 名前のない関数宣言が検出されました。スキップします。', { component: 'useFunctionCalling' }, definition)
        return
      }
      if (functionRegistry.has(name)) {
        return
      }
      registerFunctionDefinition(definition)
    })

    // manageBackground関数を動的に登録
    try {
      const manageBackgroundDef = await createManageBackgroundDefinition()
      if (!functionRegistry.has('manageBackground')) {
        registerFunctionDefinition(manageBackgroundDef)
      }
    } catch (error) {
      logger.error('[Function Calling] manageBackground関数の初期化に失敗しました', { component: 'useFunctionCalling' }, error)
    }

    logger.info('[Function Calling] デフォルト関数が初期化されました', {
      total: functionRegistry.size,
      enabled: getEnabledFunctionNames(),
      component: 'useFunctionCalling',
    })
  }

  /**
   * 関数レジストリの統計情報を取得する
   */
  const getRegistryStats = () => {
    const totalFunctions = functionRegistry.size
    const enabledFunctions = Array.from(functionRegistry.values()).filter((entry) => entry.enabled).length
    const categories = new Set(
      Array.from(functionRegistry.values())
        .map((entry) => entry.meta?.category)
        .filter((category): category is string => Boolean(category))
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
    initializeDefaultFunctions().catch((error) => {
      logger.error('[Function Calling] デフォルト関数の初期化に失敗しました', { component: 'useFunctionCalling' }, error)
    })
  }

  return {
    functionRegistry: readonly(functionRegistry),
    executionLogs: readonly(executionLogs),

    registerFunction,
    registerFunctionDefinition,
    unregisterFunction,
    toggleFunction,
    setFunctionEnablement,
    getEnabledFunctionDeclarations,
    getEnabledFunctionNames,
    getFunctionRegistryEntries,
    refreshManageBackgroundDeclaration,

    executeFunction,
    executeFunctions,

    clearExecutionLogs,
    initializeDefaultFunctions,
    getRegistryStats,
  }
}

export type UseFunctionCallingReturn = ReturnType<typeof useFunctionCalling>
