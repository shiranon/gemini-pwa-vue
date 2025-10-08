import Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam, MessageCreateParams, MessageParam, Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { generateMessageId } from '~/lib/ids'
import { useChatStore } from '~/stores/chat'
import type { ChatMessage, ClaudeApiSettings } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/utils/logger'

/**
 * Claude APIレスポンスから思考プロセスを抽出する
 */
interface ThoughtExtractionResult {
  content: string
  thoughts?: string
}

export interface ClaudeStreamingChunk {
  type: 'chunk'
  contentText: string
  toolCalls?: FunctionCall[]
  data: Record<string, unknown> & {
    toolResults?: FunctionCallResult[]
  }
}

export interface ClaudeCombinedResponse {
  content: string
  stopReason?: string | null
  toolCalls?: FunctionCall[]
  toolResults?: FunctionCallResult[]
}

export const useClaudeApi = () => {
  const { getEnabledFunctionDeclarations, executeFunction } = useFunctionCalling()
  const chatStore = useChatStore()

  const createClaudeClient = (apiKey: string) => {
    return new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // ブラウザから直接APIを呼び出すための設定
    })
  }

  /**
   * Extended ThinkingとCache Controlを含むAPI設定を構築
   */
  const buildApiConfig = (
    settings: ClaudeApiSettings,
    toolConfig: { tools?: Tool[] }
  ): {
    thinkingConfig?: { type: 'enabled'; budget_tokens: number }
    systemPromptValue?: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
    toolsWithCache?: Tool[]
  } => {
    // Extended Thinking設定
    const thinkingConfig =
      settings.enableExtendedThinking && settings.thinkingBudget
        ? {
            type: 'enabled' as const,
            budget_tokens: settings.thinkingBudget,
          }
        : undefined

    // Cache Control: System Prompt
    let systemPromptValue: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> | undefined
    if (settings.systemPrompt) {
      if (settings.enableCacheControl && settings.cacheSystemPrompt) {
        systemPromptValue = [
          {
            type: 'text' as const,
            text: settings.systemPrompt,
            cache_control: { type: 'ephemeral' as const },
          },
        ]
      } else {
        systemPromptValue = settings.systemPrompt
      }
    }

    // Cache Control: Tools
    let toolsWithCache = toolConfig.tools
    if (toolsWithCache && settings.enableCacheControl && settings.cacheTools && toolsWithCache.length > 0) {
      // 最後のツールにcache_controlを追加（コスト最適化）
      toolsWithCache = toolsWithCache.map((tool, index) => {
        if (index === toolsWithCache!.length - 1) {
          return {
            ...tool,
            cache_control: { type: 'ephemeral' as const },
          }
        }
        return tool
      })
    }

    return { thinkingConfig, systemPromptValue, toolsWithCache }
  }

  /**
   * ContentBlock配列からtool_useブロックのIDを抽出
   */
  const extractToolUseIds = (contentBlocks: Array<{ type: string; id?: string }>): string[] => {
    const toolUseIds: string[] = []
    for (const block of contentBlocks) {
      if (block.type === 'tool_use' && block.id) {
        toolUseIds.push(block.id)
      }
    }
    return toolUseIds
  }

  /**
   * FunctionCallResult配列からToolResultBlockParam配列を構築
   * tool_use IDとの対応関係を維持
   */
  const buildToolResultBlocks = (toolResults: FunctionCallResult[], toolUseIds: string[], context: string): ToolResultBlockParam[] => {
    const toolResultBlocks: ToolResultBlockParam[] = []

    for (let i = 0; i < toolResults.length; i++) {
      const toolResult = toolResults[i]
      if (!toolResult) continue

      const toolUseId = toolUseIds[i]
      if (!toolUseId) {
        logger.warn(`[${context}] tool_use_idが見つかりません`, {
          component: 'useClaudeApi',
          resultIndex: i,
        })
      }

      const payload = toolResult.result && typeof toolResult.result === 'object' ? toolResult.result : toolResult.error ? { error: toolResult.error } : {}
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: toolUseId || generateMessageId(),
        content: JSON.stringify(payload),
      })
    }

    return toolResultBlocks
  }

  /**
   * Gemini SchemaをClaude互換のJSON Schemaに変換
   */
  const convertGeminiSchemaToClaudeSchema = (schema: unknown): Tool.InputSchema => {
    // 空の場合のデフォルト
    if (!schema || typeof schema !== 'object') {
      return {
        type: 'object' as const,
        properties: null,
      }
    }

    const schemaObj = schema as Record<string, unknown>

    // propertiesを再帰的に変換
    let convertedProperties: unknown = null
    if (schemaObj.properties && typeof schemaObj.properties === 'object') {
      const props: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(schemaObj.properties as Record<string, unknown>)) {
        if (value && typeof value === 'object') {
          const propObj = value as Record<string, unknown>
          const convertedProp: Record<string, unknown> = {}

          // typeの変換（Gemini Type列挙型 → 文字列）
          if (propObj.type !== undefined && propObj.type !== null) {
            if (typeof propObj.type === 'string') {
              convertedProp.type = propObj.type.toLowerCase()
            } else if (typeof propObj.type === 'object' && 'value' in propObj.type) {
              // Type列挙型の場合
              convertedProp.type = String((propObj.type as { value?: unknown }).value || propObj.type).toLowerCase()
            } else {
              convertedProp.type = String(propObj.type).toLowerCase()
            }
          }

          // descriptionをコピー
          if (propObj.description) {
            convertedProp.description = propObj.description
          }

          // enumをコピー
          if (propObj.enum) {
            convertedProp.enum = propObj.enum
          }

          // itemsを再帰的に変換（配列型の場合）
          if (propObj.items) {
            convertedProp.items = propObj.items
          }

          props[key] = convertedProp
        }
      }
      convertedProperties = props
    }

    // requiredをコピー
    const requiredArray = schemaObj.required && Array.isArray(schemaObj.required) ? (schemaObj.required as string[]) : null

    return {
      type: 'object' as const,
      properties: convertedProperties,
      required: requiredArray,
    }
  }

  /**
   * Tool Use用のツール設定を構築する
   */
  const buildToolConfig = (settings: ClaudeApiSettings): { tools?: Tool[] } => {
    logger.info('[関数呼び出し] 設定:', { component: 'useClaudeApi' }, settings.functionCalling?.enabled ? settings.functionCalling : '無効')

    const tools: Tool[] = []

    // 有効時のみFunction Callingツールを追加
    if (settings.functionCalling?.enabled) {
      const enabledFunctions = getEnabledFunctionDeclarations()
      logger.info('[関数呼び出し] 有効な関数:', {
        component: 'useClaudeApi',
        count: enabledFunctions.length,
        names: enabledFunctions.map((f) => f.name),
        functions: enabledFunctions,
      })

      let functionDeclarations = enabledFunctions
      if (settings.functionCalling.allowedFunctionNames?.length) {
        const allowedSet = new Set(settings.functionCalling.allowedFunctionNames)
        const availableNames = new Set(enabledFunctions.map((declaration) => declaration.name).filter((name): name is string => typeof name === 'string'))
        const missingNames = settings.functionCalling.allowedFunctionNames.filter((name) => !availableNames.has(name))
        if (missingNames.length > 0) {
          logger.warn('[関数呼び出し] allowedFunctionNamesに未登録の関数があります:', { component: 'useClaudeApi' }, missingNames)
        }

        functionDeclarations = enabledFunctions.filter((declaration) => declaration.name && allowedSet.has(declaration.name))

        if (functionDeclarations.length !== enabledFunctions.length) {
          logger.info('[関数呼び出し] allowedFunctionNamesで関数をフィルタリングしました', {
            before: enabledFunctions.length,
            after: functionDeclarations.length,
            allowedFunctionNames: settings.functionCalling.allowedFunctionNames,
          })
        }
      }

      if (functionDeclarations.length > 0) {
        // Gemini FunctionDeclaration型からClaude Tool型への変換
        functionDeclarations.forEach((func) => {
          if (func.name && func.description) {
            const inputSchema: Tool.InputSchema = func.parameters
              ? convertGeminiSchemaToClaudeSchema(func.parameters)
              : {
                  type: 'object' as const,
                  properties: null,
                }

            tools.push({
              name: func.name,
              description: func.description,
              input_schema: inputSchema,
            })
          }
        })
      }
    } else {
      logger.info('[関数呼び出し] Function Calling は無効です', { component: 'useClaudeApi' })
    }

    return tools.length > 0 ? { tools } : {}
  }

  /**
   * Tool Use を検出・実行する
   */
  const handleToolCalls = async (content: Array<Anthropic.ContentBlock>, messageId?: string): Promise<{ toolCalls: FunctionCall[]; toolResults: FunctionCallResult[] }> => {
    logger.info('[非ストリーミング] Tool Use処理開始:', { messageId })
    const toolCalls: FunctionCall[] = []
    const toolResults: FunctionCallResult[] = []

    for (let i = 0; i < content.length; i++) {
      const block = content[i]
      logger.info(`[非ストリーミング] コンテンツブロック ${i + 1}:`, { component: 'useClaudeApi' }, block)

      if (block && block.type === 'tool_use') {
        const toolCall: FunctionCall = {
          name: block.name,
          args: block.input as Record<string, unknown>,
        }
        logger.info(`[非ストリーミング] Tool Call検出 ${toolCalls.length + 1}:`, { component: 'useClaudeApi' }, toolCall)
        toolCalls.push(toolCall)

        try {
          logger.info(`[非ストリーミング] 関数実行開始 ${toolResults.length + 1}:`, { component: 'useClaudeApi' }, toolCall.name)
          const result = await executeFunction(toolCall, {
            messageId,
            timestamp: Date.now(),
            persistentMemory: chatStore.currentSession?.persistentMemory || {},
          })
          logger.info(`[非ストリーミング] 関数実行完了 ${toolResults.length + 1}:`, { component: 'useClaudeApi' }, toolCall.name, result)
          toolResults.push(result)

          // persistentMemoryを更新
          if (result.context?.persistentMemory && chatStore.currentSession) {
            chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
          }
        } catch (error) {
          logger.error(`[非ストリーミング] 関数の実行に失敗 ${toolResults.length + 1}:`, { component: 'useClaudeApi' }, toolCall.name, error)
          const errorResult = {
            name: toolCall.name,
            args: toolCall.args,
            result: null,
            error: error instanceof Error ? error.message : String(error),
          }
          toolResults.push(errorResult)
        }
      }
    }

    logger.info('[非ストリーミング] Tool Use処理完了:', {
      toolCallsCount: toolCalls.length,
      toolResultsCount: toolResults.length,
      toolCalls: toolCalls.map((tc) => ({ name: tc.name, args: tc.args })),
      toolResults: toolResults.map((tr) => ({ name: tr.name, hasResult: !!tr.result, hasError: !!tr.error })),
    })

    return { toolCalls, toolResults }
  }

  /**
   * チャットメッセージをClaude API用の形式に変換する
   * tool_useとtool_resultのIDマッピングを保持して整合性を確保
   */
  const toContent = (messages: ChatMessage[]): MessageParam[] => {
    const result: MessageParam[] = []
    // assistantメッセージのtool_use IDを保存（次のuserメッセージで参照）
    const toolUseIdMap = new Map<number, string[]>()

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      if (!m) continue

      // assistantメッセージにfunctionCallsがある場合、content blocksに変換
      if (m.role === 'assistant' && m.functionCalls) {
        const blocks: ContentBlockParam[] = []
        if (m.content) {
          blocks.push({ type: 'text', text: m.content })
        }

        const toolUseIds: string[] = []
        m.functionCalls.forEach((call) => {
          const toolUseId = generateMessageId()
          toolUseIds.push(toolUseId)

          blocks.push({
            type: 'tool_use',
            id: toolUseId,
            name: call.name,
            input: call.args || {},
          })
        })

        // 次のuserメッセージで参照できるようにIDを保存
        toolUseIdMap.set(i, toolUseIds)

        result.push({
          role: 'assistant' as const,
          content: blocks,
        })
      } else if (m.role === 'user' && m.functionResults) {
        // userメッセージにfunctionResultsがある場合、tool_resultに変換
        const blocks: ContentBlockParam[] = []
        if (m.content) {
          blocks.push({ type: 'text', text: m.content })
        }

        // 直前のassistantメッセージのtool_use IDを取得
        const prevAssistantIdx = i - 1
        const toolUseIds = toolUseIdMap.get(prevAssistantIdx) || []

        m.functionResults.forEach((funcResult, idx) => {
          const toolUseId = toolUseIds[idx]
          if (!toolUseId) {
            logger.warn('[Claude API] tool_use_idが見つかりません。新規IDを生成します。', {
              component: 'useClaudeApi',
              messageIndex: i,
              resultIndex: idx,
            })
          }

          blocks.push({
            type: 'tool_result',
            tool_use_id: toolUseId || generateMessageId(),
            content: JSON.stringify(funcResult.result || { error: funcResult.error }),
          })
        })

        result.push({
          role: 'user' as const,
          content: blocks,
        })
      } else {
        // 通常のメッセージ
        result.push({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        })
      }
    }

    return result
  }

  /**
   * Claude API を非ストリーミングで呼び出す
   */
  const generateContent = async (messages: ChatMessage[], settings: ClaudeApiSettings): Promise<ClaudeCombinedResponse> => {
    const claude = createClaudeClient(settings.apiKey)
    const toolConfig = buildToolConfig(settings)

    try {
      // メッセージをClaude Message型に変換
      const currentMessages = [...messages]
      // 送信直前のダミー挿入（初回呼び出し時のみ）
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', content: settings.dummyUserPrompt, timestamp: Date.now() })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'assistant', content: settings.dummyModelPrompt, timestamp: Date.now() })
      }
      const currentContents: MessageParam[] = toContent(currentMessages)

      // Extended ThinkingとCache Controlの設定を構築
      const { thinkingConfig, systemPromptValue, toolsWithCache } = buildApiConfig(settings, toolConfig)

      const params: MessageCreateParams = {
        model: settings.model,
        max_tokens: settings.maxTokens,
        messages: currentContents,
        ...(systemPromptValue && { system: systemPromptValue }),
        ...(settings.temperature !== undefined && { temperature: settings.temperature }),
        ...(settings.temperature === undefined && settings.topP !== undefined && { top_p: settings.topP }),
        ...(settings.topK !== undefined && { top_k: settings.topK }),
        ...(thinkingConfig && { thinking: thinkingConfig }),
        ...(toolsWithCache && { tools: toolsWithCache }),
      }

      const response = await claude.messages.create(params)

      // Tool Useの処理
      let toolCalls: FunctionCall[] = []
      let toolResults: FunctionCallResult[] = []

      if (settings.functionCalling?.enabled && response.content.some((block) => block.type === 'tool_use')) {
        const tcResult = await handleToolCalls(response.content, generateMessageId())
        toolCalls = tcResult.toolCalls
        toolResults = tcResult.toolResults

        if (toolCalls.length > 0) {
          logger.info('[非ストリーミング] Tool呼び出しを検出:', {
            toolCallsCount: toolCalls.length,
            toolResultsCount: toolResults.length,
          })

          // Tool Call結果をメッセージに追加
          const assistantMessage: MessageParam = {
            role: 'assistant',
            content: response.content,
          }
          currentContents.push(assistantMessage)

          // response.contentからtool_useブロックのIDを抽出してtool_resultを構築
          const toolUseIds = extractToolUseIds(response.content)
          const toolResultBlocks = buildToolResultBlocks(toolResults, toolUseIds, '非ストリーミング')

          currentContents.push({
            role: 'user',
            content: toolResultBlocks,
          })

          // Tool Call結果を含めて再度API呼び出し（tool_choiceをnoneに設定）
          const finalParams: MessageCreateParams = {
            model: settings.model,
            max_tokens: settings.maxTokens,
            messages: currentContents,
            ...(settings.systemPrompt && { system: settings.systemPrompt }),
            ...(settings.temperature !== undefined && { temperature: settings.temperature }),
            ...(settings.temperature === undefined && settings.topP !== undefined && { top_p: settings.topP }),
            ...(settings.topK !== undefined && { top_k: settings.topK }),
          }

          const finalResponse = await claude.messages.create(finalParams)

          // 最終的なレスポンスを返す
          const finalContent = finalResponse.content
            .filter((block) => block.type === 'text')
            .map((block) => (block.type === 'text' ? block.text : ''))
            .join('')

          return {
            content: finalContent,
            stopReason: finalResponse.stop_reason ?? undefined,
            toolCalls,
            toolResults,
          }
        }
      }

      // Tool Callがない場合は通常のレスポンスを返す
      const contentText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('')

      return {
        content: contentText,
        stopReason: response.stop_reason ?? undefined,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claude API call failed'
      throw new Error(errorMessage)
    }
  }

  /**
   * Claude API をストリーミングで呼び出す
   */
  const generateContentStream = async function* (messages: ChatMessage[], settings: ClaudeApiSettings) {
    const claude = createClaudeClient(settings.apiKey)
    const toolConfig = buildToolConfig(settings)

    try {
      // メッセージをClaude Message型に変換
      const currentMessages = [...messages]
      // 送信直前のダミー挿入（初回ストリーミング呼び出しのみ）
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', content: settings.dummyUserPrompt, timestamp: Date.now() })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'assistant', content: settings.dummyModelPrompt, timestamp: Date.now() })
      }
      const currentContents: MessageParam[] = toContent(currentMessages)

      // Extended ThinkingとCache Controlの設定を構築
      const { thinkingConfig, systemPromptValue, toolsWithCache } = buildApiConfig(settings, toolConfig)

      const params: MessageCreateParams = {
        model: settings.model,
        max_tokens: settings.maxTokens,
        messages: currentContents,
        stream: true,
        ...(systemPromptValue && { system: systemPromptValue }),
        ...(settings.temperature !== undefined && { temperature: settings.temperature }),
        ...(settings.temperature === undefined && settings.topP !== undefined && { top_p: settings.topP }),
        ...(settings.topK !== undefined && { top_k: settings.topK }),
        ...(thinkingConfig && { thinking: thinkingConfig }),
        ...(toolsWithCache && { tools: toolsWithCache }),
      }

      const stream = claude.messages.stream(params)

      let accumulatedToolCalls: FunctionCall[] = []
      const accumulatedToolResults: FunctionCallResult[] = []
      const accumulatedContent: Anthropic.ContentBlock[] = []

      for await (const chunk of stream) {
        let contentText = ''
        const toolCalls: FunctionCall[] = []

        if (chunk.type === 'content_block_start') {
          const block = chunk.content_block
          if (block.type === 'tool_use') {
            // Tool Callを蓄積
            accumulatedContent.push(block)
          }
        } else if (chunk.type === 'content_block_delta') {
          const delta = chunk.delta
          if (delta.type === 'text_delta') {
            contentText = delta.text
          } else if (delta.type === 'input_json_delta') {
            // Tool Call入力の差分を蓄積（最終的にcontent_block_stopで処理）
          }
        } else if (chunk.type === 'content_block_stop') {
          // Tool Callの完了を検出
          if (accumulatedContent.length > 0) {
            for (const block of accumulatedContent) {
              if (block.type === 'tool_use') {
                const toolCall: FunctionCall = {
                  name: block.name,
                  args: block.input as Record<string, unknown>,
                }
                toolCalls.push(toolCall)
              }
            }
          }
        }

        // Tool Call を実行
        if (toolCalls.length > 0 && settings.functionCalling?.enabled) {
          logger.info('[ストリーミング] Tool Call検出:', {
            newToolCalls: toolCalls,
            currentAccumulatedCalls: accumulatedToolCalls.length,
            currentAccumulatedResults: accumulatedToolResults.length,
          })

          accumulatedToolCalls = [...accumulatedToolCalls, ...toolCalls]
          for (const toolCall of toolCalls) {
            logger.info('[ストリーミング] 関数実行開始:', { component: 'useClaudeApi' }, toolCall.name, toolCall.args)
            try {
              const result = await executeFunction(toolCall, {
                messageId: generateMessageId(),
                timestamp: Date.now(),
                persistentMemory: chatStore.currentSession?.persistentMemory || {},
              })
              logger.info('[ストリーミング] 関数実行完了:', { component: 'useClaudeApi' }, toolCall.name, result)
              accumulatedToolResults.push(result)

              // persistentMemoryを更新
              if (result.context?.persistentMemory && chatStore.currentSession) {
                chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
              }
            } catch (error) {
              logger.error('[ストリーミング] 関数の実行に失敗:', { component: 'useClaudeApi' }, toolCall.name, error)
              const errorResult = {
                name: toolCall.name,
                args: toolCall.args,
                result: null,
                error: error instanceof Error ? error.message : String(error),
              }
              accumulatedToolResults.push(errorResult)
            }
          }
        }

        if (contentText || toolCalls.length > 0 || accumulatedToolCalls.length > 0) {
          yield {
            type: 'chunk' as const,
            contentText,
            toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
            data: accumulatedToolResults.length > 0 ? { toolResults: accumulatedToolResults } : {},
          }
        }
      }

      // Tool Callがある場合、結果をAPIに送り返して最終回答をストリーミング
      if (accumulatedToolCalls.length > 0 && settings.functionCalling?.enabled) {
        logger.info('[ストリーミング関数呼び出し] Tool結果をAPIへ送信', {
          toolCallsCount: accumulatedToolCalls.length,
          toolResultsCount: accumulatedToolResults.length,
        })

        // Tool CallとTool Resultの数が一致しているかチェック
        if (accumulatedToolCalls.length !== accumulatedToolResults.length) {
          logger.error('[ストリーミング関数呼び出し] Tool CallとTool Resultの数が一致しません', {
            calls: accumulatedToolCalls.length,
            results: accumulatedToolResults.length,
          })
          throw new Error(`Tool CallとTool Resultの数が一致しません: ${accumulatedToolCalls.length} calls, ${accumulatedToolResults.length} results`)
        }

        // アシスタントのTool Callレスポンスを追加（accumulatedContentを使用）
        currentContents.push({
          role: 'assistant',
          content: accumulatedContent,
        })

        // accumulatedContentからtool_useブロックのIDを抽出してtool_resultを構築
        const toolUseIds = extractToolUseIds(accumulatedContent)
        const toolResultBlocks = buildToolResultBlocks(accumulatedToolResults, toolUseIds, 'ストリーミング')

        currentContents.push({
          role: 'user',
          content: toolResultBlocks,
        })

        // Tool Call結果を含めて再度ストリーミング
        const finalParams: MessageCreateParams = {
          model: settings.model,
          max_tokens: settings.maxTokens,
          messages: currentContents,
          stream: true,
          ...(settings.systemPrompt && { system: settings.systemPrompt }),
          ...(settings.temperature !== undefined && { temperature: settings.temperature }),
          ...(settings.temperature === undefined && settings.topP !== undefined && { top_p: settings.topP }),
          ...(settings.topK !== undefined && { top_k: settings.topK }),
        }

        const finalStream = claude.messages.stream(finalParams)

        for await (const chunk of finalStream) {
          let contentText = ''

          if (chunk.type === 'content_block_delta') {
            const delta = chunk.delta
            if (delta.type === 'text_delta') {
              contentText = delta.text
            }
          }

          if (contentText) {
            yield {
              type: 'chunk' as const,
              contentText,
              toolCalls: accumulatedToolCalls,
              data: { toolResults: accumulatedToolResults },
            }
          }
        }
      }

      // ストリーミング完了時にTool Call結果を最終的に返す
      if (accumulatedToolCalls.length > 0) {
        yield {
          type: 'chunk' as const,
          contentText: '',
          toolCalls: accumulatedToolCalls,
          data: { toolResults: accumulatedToolResults },
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claude streaming API call failed'
      throw new Error(errorMessage)
    }
  }

  /**
   * 利用可能なモデル一覧を取得する（Claude固定リスト）
   */
  const getAvailableModels = async (_apiKey: string): Promise<string[]> => {
    // Claude APIにはモデル一覧取得APIがないため、固定リストを返す
    return [
      // Claude 4 Models
      'claude-opus-4-1-20250805',
      'claude-opus-4-20250514',
      'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-20250514',
      // Claude 3.7 Models
      'claude-3-7-sonnet-20250219',
      'claude-3-5-haiku-20241022',
    ]
  }

  /**
   * 思考プロセスを抽出する（将来のExtended Thinking対応用）
   */
  const extractThoughtsFromResponse = (response: ClaudeCombinedResponse): ThoughtExtractionResult => {
    // 現時点では思考プロセス機能は未対応
    return {
      content: response.content,
      thoughts: undefined,
    }
  }

  return {
    createClaudeClient,
    generateContent,
    generateContentStream,
    getAvailableModels,
    extractThoughtsFromResponse,
  }
}

export type UseClaudeApiReturn = ReturnType<typeof useClaudeApi>
