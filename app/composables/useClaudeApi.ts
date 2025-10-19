import Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam, MessageCreateParams, MessageParam, Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import { Type } from '@google/genai'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { generateMessageId } from '~/lib/ids'
import { useChatStore } from '~/stores/chat'
import type { ThoughtExtractionResult } from '~/types/api'
import type { AttachedFile, ChatMessage, ClaudeApiSettings } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/utils/logger'
import { executeFunctionCallsCommon, filterFunctionsByAllowedNames, buildApiErrorMessage, logFunctionCallCompletion } from '~/lib/apiCommon'

export interface ClaudeStreamingChunk {
  type: 'chunk'
  contentText: string
  thoughts?: string
  toolCalls?: FunctionCall[]
  data: Record<string, unknown> & {
    toolResults?: FunctionCallResult[]
  }
}

export interface ClaudeCombinedResponse {
  content: string
  stopReason?: string | null
  thoughts?: string
  toolCalls?: FunctionCall[]
  toolResults?: FunctionCallResult[]
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

const normalizeMimeType = (mimeType: string | undefined): string => {
  if (!mimeType || mimeType.trim().length === 0) {
    return 'application/octet-stream'
  }
  if (mimeType === 'image/jpg') return 'image/jpeg'
  return mimeType
}

const buildAttachmentBlocks = (attachments: AttachedFile[]): ContentBlockParam[] => {
  const blocks: ContentBlockParam[] = []

  for (const file of attachments) {
    const mimeType = normalizeMimeType(file.type)

    if (mimeType.startsWith('image/')) {
      if (ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: file.data,
          },
        })
      } else {
        blocks.push({ type: 'text', text: `添付ファイル（画像）: ${file.name}` })
      }
    } else if (mimeType === 'application/pdf') {
      blocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: file.data,
        },
      })
    } else {
      blocks.push({ type: 'text', text: `添付ファイル: ${file.name} (${mimeType})` })
    }
  }

  return blocks
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
    // Extended Thinking設定（enableThinkingまたはenableExtendedThinkingで有効化）
    const isThinkingEnabled = settings.enableThinking || settings.enableExtendedThinking

    // thinkingBudgetの処理: null/undefined/0の場合はデフォルト値5000を使用
    const effectiveBudget =
      settings.thinkingBudget && settings.thinkingBudget > 0
        ? settings.thinkingBudget
        : isThinkingEnabled
          ? 5000 // デフォルト値: 5000トークン
          : null

    const thinkingConfig =
      isThinkingEnabled && effectiveBudget
        ? {
            type: 'enabled' as const,
            budget_tokens: effectiveBudget,
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
   * ContentBlock配列からtool_useブロックのIDと関数名を抽出
   */
  const extractToolUseCalls = (contentBlocks: Array<{ type: string; id?: string; name?: string }>): Array<{ id: string; name: string }> => {
    const toolUseCalls: Array<{ id: string; name: string }> = []
    for (const block of contentBlocks) {
      if (block.type === 'tool_use' && block.id && block.name) {
        toolUseCalls.push({ id: block.id, name: block.name })
      }
    }
    return toolUseCalls
  }

  /**
   * ContentBlock配列からthinkingブロックのテキストを抽出
   */
  const extractThinkingText = (contentBlocks: Array<{ type: string; thinking?: string }>): string | undefined => {
    const thinkingTexts: string[] = []
    for (const block of contentBlocks) {
      if (block.type === 'thinking' && block.thinking) {
        thinkingTexts.push(block.thinking)
      }
    }
    return thinkingTexts.length > 0 ? thinkingTexts.join('\n\n') : undefined
  }

  /**
   * FunctionCallResult配列からToolResultBlockParam配列を構築
   * tool_use IDとの対応関係を安全に維持（関数名ベースのマッピング）
   */
  const buildToolResultBlocks = (toolResults: FunctionCallResult[], toolUseCalls: Array<{ id: string; name: string }>, context: string): ToolResultBlockParam[] => {
    const toolResultBlocks: ToolResultBlockParam[] = []

    // 関数名をキーとしたMapを作成
    const toolResultsMap = new Map<string, FunctionCallResult>()
    for (const result of toolResults) {
      if (result.name) {
        toolResultsMap.set(result.name, result)
      }
    }

    for (const toolUseCall of toolUseCalls) {
      const toolResult = toolResultsMap.get(toolUseCall.name)
      if (!toolResult) {
        logger.warn(`[${context}] 関数実行結果が見つかりません`, {
          component: 'useClaudeApi',
          functionName: toolUseCall.name,
          toolUseId: toolUseCall.id,
        })
        // 結果が見つからない場合は空の結果を送信
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: toolUseCall.id,
          content: JSON.stringify({ error: 'Function execution result not found' }),
        })
        continue
      }

      const payload = toolResult.result && typeof toolResult.result === 'object' ? toolResult.result : toolResult.error ? { error: toolResult.error } : {}
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: toolUseCall.id,
        content: JSON.stringify(payload),
      })
    }

    return toolResultBlocks
  }

  /**
   * GeminiのType列挙型かどうかを判定する型ガード
   */
  const isGeminiType = (value: unknown): value is Type => {
    return typeof value === 'string' && Object.values(Type).includes(value as Type)
  }

  /**
   * Gemini SchemaをClaude互換のJSON Schemaに変換
   * メモ化により同じschemaの変換を繰り返さない
   * キャッシュサイズ制限によりメモリリークを防止
   */
  const MAX_CACHE_SIZE = 100
  const schemaConversionCache = new Map<string, Tool.InputSchema>()

  // 型ガード関数: 有効なプロパティオブジェクトかどうかを検証
  const isValidPropertiesObject = (val: unknown): val is Record<string, unknown> => {
    return val !== null && typeof val === 'object' && !Array.isArray(val)
  }

  const convertGeminiSchemaToClaudeSchema = (schema: unknown): Tool.InputSchema => {
    // キャッシュキーを生成（schemaの文字列表現を使用）
    const cacheKey = JSON.stringify(schema)

    // キャッシュにあれば返す
    if (schemaConversionCache.has(cacheKey)) {
      return schemaConversionCache.get(cacheKey)!
    }
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
            if (isGeminiType(propObj.type)) {
              // Type列挙型の場合、そのまま小文字に変換
              convertedProp.type = propObj.type.toLowerCase()
            } else if (typeof propObj.type === 'string') {
              // すでに文字列の場合
              convertedProp.type = propObj.type.toLowerCase()
            } else {
              // その他の場合は文字列化
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
            convertedProp.items = convertGeminiSchemaToClaudeSchema(propObj.items)
          }

          props[key] = convertedProp
        }
      }
      convertedProperties = props
    }

    // requiredをコピー
    const requiredArray = schemaObj.required && Array.isArray(schemaObj.required) ? (schemaObj.required as string[]) : null

    const result: Tool.InputSchema = {
      type: 'object' as const,
      properties: isValidPropertiesObject(convertedProperties) ? convertedProperties : null,
      required: requiredArray,
    }

    // キャッシュサイズ制限: 古いエントリを削除
    if (schemaConversionCache.size >= MAX_CACHE_SIZE) {
      const firstKey = schemaConversionCache.keys().next().value
      if (firstKey !== undefined) {
        schemaConversionCache.delete(firstKey)
      }
    }

    // キャッシュに保存
    schemaConversionCache.set(cacheKey, result)

    return result
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

      // 共通関数を使用してフィルタリング
      const functionDeclarations = filterFunctionsByAllowedNames(enabledFunctions, settings.functionCalling.allowedFunctionNames, 'useClaudeApi')

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
    }

    return tools.length > 0 ? { tools } : {}
  }

  /**
   * Tool Use を検出・実行する
   */
  const handleToolCalls = async (content: Array<Anthropic.ContentBlock>, messageId?: string): Promise<{ toolCalls: FunctionCall[]; toolResults: FunctionCallResult[] }> => {
    const toolCalls: FunctionCall[] = []

    for (let i = 0; i < content.length; i++) {
      const block = content[i]

      if (block && block.type === 'tool_use') {
        const toolCall: FunctionCall = {
          name: block.name,
          args: block.input as Record<string, unknown>,
        }
        toolCalls.push(toolCall)
      }
    }

    // 共通関数を使用してTool Callを実行
    const toolResults = await executeFunctionCallsCommon(toolCalls, {
      executeFunction,
      context: {
        messageId,
        timestamp: Date.now(),
        persistentMemory: chatStore.currentSession?.persistentMemory || {},
      },
      componentName: 'useClaudeApi',
      isStreaming: false,
    })

    // persistentMemoryを更新
    for (const result of toolResults) {
      if (result.context?.persistentMemory && chatStore.currentSession) {
        chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
      }
    }

    // 共通関数を使用してログ出力
    logFunctionCallCompletion(toolCalls, toolResults, 'useClaudeApi', '非ストリーミング')

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

        if (m.attachments?.length) {
          blocks.push(...buildAttachmentBlocks(m.attachments))
        }

        // 直前のassistantメッセージのtool_use IDを取得
        const prevAssistantIdx = i - 1
        const toolUseIds = toolUseIdMap.get(prevAssistantIdx) || []

        m.functionResults.forEach((funcResult, idx) => {
          const toolUseId = toolUseIds[idx]
          if (!toolUseId) {
            logger.error('[Claude API] tool_use_idが見つかりません', {
              component: 'useClaudeApi',
              messageIndex: i,
              resultIndex: idx,
              functionResultsLength: m.functionResults?.length || 0,
              toolUseIdsLength: toolUseIds.length,
            })
            throw new Error(
              `[Claude API] tool_use_idが見つかりません。メッセージインデックス: ${i}, 結果インデックス: ${idx}, functionResults: ${m.functionResults?.length || 0}, toolUseIds: ${toolUseIds.length}`
            )
          }

          blocks.push({
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: JSON.stringify(funcResult.result || { error: funcResult.error }),
          })
        })

        result.push({
          role: 'user' as const,
          content: blocks,
        })
      } else {
        if (m.role === 'user') {
          const blocks: ContentBlockParam[] = []
          if (m.content) {
            blocks.push({ type: 'text', text: m.content })
          }
          if (m.attachments?.length) {
            blocks.push(...buildAttachmentBlocks(m.attachments))
          }

          if (blocks.length === 0) {
            blocks.push({ type: 'text', text: '' })
          }

          result.push({
            role: 'user',
            content: blocks,
          })
        } else {
          // 通常のアシスタントメッセージ
          result.push({
            role: 'assistant' as const,
            content: m.content,
          })
        }
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
        // Extended Thinking有効時はtop_kを設定できない
        ...(!thinkingConfig && settings.topK !== undefined && { top_k: settings.topK }),
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
          // Tool Call結果をメッセージに追加
          const assistantMessage: MessageParam = {
            role: 'assistant',
            content: response.content,
          }
          currentContents.push(assistantMessage)

          // response.contentからtool_useブロックのIDと関数名を抽出してtool_resultを構築
          const toolUseCalls = extractToolUseCalls(response.content)
          const toolResultBlocks = buildToolResultBlocks(toolResults, toolUseCalls, '非ストリーミング')

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
            // Extended Thinking有効時はtop_kを設定できない
            ...(!thinkingConfig && settings.topK !== undefined && { top_k: settings.topK }),
          }

          const finalResponse = await claude.messages.create(finalParams)

          // 最終的なレスポンスを返す
          const finalContent = finalResponse.content
            .filter((block) => block.type === 'text')
            .map((block) => (block.type === 'text' ? block.text : ''))
            .join('')

          // Thinking ブロックを抽出
          const thoughts = extractThinkingText(finalResponse.content)

          return {
            content: finalContent,
            stopReason: finalResponse.stop_reason ?? undefined,
            thoughts,
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

      // Thinking ブロックを抽出
      const thoughts = extractThinkingText(response.content)

      return {
        content: contentText,
        stopReason: response.stop_reason ?? undefined,
        thoughts,
      }
    } catch (error: unknown) {
      // 共通関数を使用してエラーメッセージを構築
      const errorMessage = buildApiErrorMessage(error, 'Claude API call failed', 'Claude')
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
        // Extended Thinking有効時はtop_kを設定できない
        ...(!thinkingConfig && settings.topK !== undefined && { top_k: settings.topK }),
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
          // 全てのブロックタイプを蓄積（tool_use, thinking, text等）
          accumulatedContent.push(block)
        } else if (chunk.type === 'content_block_delta') {
          const delta = chunk.delta
          if (delta.type === 'text_delta') {
            contentText = delta.text
          } else if (delta.type === 'thinking_delta') {
            // thinking_deltaでストリーミング中のthinkingテキストを蓄積
            // 最後のthinkingブロックを更新
            const lastBlock = accumulatedContent[accumulatedContent.length - 1]
            if (lastBlock && lastBlock.type === 'thinking') {
              lastBlock.thinking = (lastBlock.thinking || '') + (delta.thinking || '')
            }
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
          accumulatedToolCalls = [...accumulatedToolCalls, ...toolCalls]

          // 共通関数を使用してTool Callを実行
          const newResults = await executeFunctionCallsCommon(toolCalls, {
            executeFunction,
            context: {
              messageId: generateMessageId(),
              timestamp: Date.now(),
              persistentMemory: chatStore.currentSession?.persistentMemory || {},
            },
            componentName: 'useClaudeApi',
            isStreaming: true,
          })

          // 結果を蓄積
          accumulatedToolResults.push(...newResults)

          // persistentMemoryを更新
          for (const result of newResults) {
            if (result.context?.persistentMemory && chatStore.currentSession) {
              chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
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
        // アシスタントのTool Callレスポンスを追加（accumulatedContentを使用）
        currentContents.push({
          role: 'assistant',
          content: accumulatedContent,
        })

        // accumulatedContentからtool_useブロックのIDと関数名を抽出してtool_resultを構築
        const toolUseCalls = extractToolUseCalls(accumulatedContent)
        const toolResultBlocks = buildToolResultBlocks(accumulatedToolResults, toolUseCalls, 'ストリーミング')

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

      // ストリーミング完了時にTool Call結果とthinkingを最終的に返す
      const thoughts = extractThinkingText(accumulatedContent)

      if (accumulatedToolCalls.length > 0 || thoughts) {
        yield {
          type: 'chunk' as const,
          contentText: '',
          thoughts,
          toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
          data: accumulatedToolCalls.length > 0 ? { toolResults: accumulatedToolResults } : {},
        }
      }
    } catch (error: unknown) {
      // 共通関数を使用してエラーメッセージを構築
      const errorMessage = buildApiErrorMessage(error, 'Claude streaming API call failed', 'Claude')
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
   * 思考プロセスを抽出する（Extended Thinking対応）
   */
  const extractThoughtsFromResponse = (response: ClaudeCombinedResponse): ThoughtExtractionResult => {
    return {
      content: response.content,
      thoughts: response.thoughts,
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
