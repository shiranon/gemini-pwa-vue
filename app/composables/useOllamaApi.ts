/**
 * Ollama API composable
 * OpenAI互換APIを使用してOllamaと通信する
 */

import { OpenAI } from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import { Type } from '@google/genai'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { buildApiErrorMessage, executeFunctionCallsCommon, filterFunctionsByAllowedNames, logFunctionCallCompletion } from '~/lib/apiCommon'
import { safeJsonParse } from '~/lib/apiStoreCommon'
import { generateMessageId } from '~/lib/ids'
import { useChatStore } from '~/stores/chat'
import type { ChatMessage, OllamaApiSettings } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/lib/logger'
import { protocolRestrictedUrlSchema } from '~/lib/validation'

export interface OllamaStreamingChunk {
  type: 'chunk'
  contentText: string
  functionCalls?: FunctionCall[]
  data: Record<string, unknown> & {
    functionResults?: FunctionCallResult[]
  }
}

export interface OllamaCombinedResponse {
  content: string
  functionCalls?: FunctionCall[]
  functionResults?: FunctionCallResult[]
}

/**
 * Gemini API の Type enum を OpenAI の文字列型に変換
 */
const isGeminiType = (value: unknown): value is Type => {
  return typeof value === 'string' && Object.values(Type).includes(value as Type)
}

const convertGeminiTypeToOpenAiType = (type: unknown): string => {
  if (typeof type === 'string') {
    const typeStr = type.toUpperCase()
    switch (typeStr) {
      case 'OBJECT':
        return 'object'
      case 'STRING':
        return 'string'
      case 'NUMBER':
      case 'INTEGER':
        return 'number'
      case 'BOOLEAN':
        return 'boolean'
      case 'ARRAY':
        return 'array'
      default:
        return type.toLowerCase()
    }
  }
  return 'string'
}

/**
 * Gemini API のパラメータスキーマを OpenAI 形式に変換
 */
const MAX_CACHE_SIZE = 100
const schemaConversionCache = new Map<string, unknown>()

const convertGeminiSchemaToOpenAi = (schema: unknown): unknown => {
  const cacheKey = JSON.stringify(schema)
  if (schemaConversionCache.has(cacheKey)) {
    return schemaConversionCache.get(cacheKey)!
  }
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === 'type') {
      if (isGeminiType(value)) {
        result[key] = value.toLowerCase()
      } else {
        result[key] = convertGeminiTypeToOpenAiType(value)
      }
    } else if (key === 'properties' && value && typeof value === 'object') {
      const properties: Record<string, unknown> = {}
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        properties[propKey] = convertGeminiSchemaToOpenAi(propValue)
      }
      result[key] = properties
    } else if (key === 'items' && value && typeof value === 'object') {
      result[key] = convertGeminiSchemaToOpenAi(value)
    } else {
      result[key] = value
    }
  }

  if (schemaConversionCache.size >= MAX_CACHE_SIZE) {
    const firstKey = schemaConversionCache.keys().next().value
    if (firstKey !== undefined) {
      schemaConversionCache.delete(firstKey)
    }
  }
  schemaConversionCache.set(cacheKey, result)
  return result
}

export const useOllamaApi = () => {
  const { getEnabledFunctionDeclarations, executeFunction } = useFunctionCalling()
  const chatStore = useChatStore()

  const createOllamaClient = (settings: OllamaApiSettings) => {
    return new OpenAI({
      apiKey: settings.apiKey || 'ollama',
      baseURL: `${settings.baseUrl}/v1`,
      dangerouslyAllowBrowser: true,
    })
  }

  /**
   * ChatMessageをOpenAI Chat Completions形式に変換
   */
  const toOpenAiMessages = (messages: ChatMessage[], settings: OllamaApiSettings): ChatCompletionMessageParam[] => {
    const result: ChatCompletionMessageParam[] = []

    // システムプロンプト
    if (settings.systemPrompt) {
      result.push({ role: 'system', content: settings.systemPrompt })
    }

    for (const m of messages) {
      if (m.role === 'user') {
        result.push({ role: 'user', content: m.content })
      } else if (m.role === 'assistant') {
        // Function Call結果がある場合、tool_callsとtool結果を追加
        if (m.functionCalls && m.functionCalls.length > 0) {
          const toolCalls = m.functionCalls.map((call, idx) => ({
            id: `call_${idx}`,
            type: 'function' as const,
            function: {
              name: call.name,
              arguments: JSON.stringify(call.args || {}),
            },
          }))
          result.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: toolCalls,
          })

          // tool結果を追加
          if (m.functionResults) {
            m.functionResults.forEach((funcResult, idx) => {
              result.push({
                role: 'tool',
                tool_call_id: `call_${idx}`,
                content: JSON.stringify(funcResult.result || { error: funcResult.error }),
              })
            })
          }
        } else {
          result.push({ role: 'assistant', content: m.content })
        }
      }
    }

    return result
  }

  /**
   * Function Calling用のツール設定を構築する
   */
  const buildTools = (settings: OllamaApiSettings): ChatCompletionTool[] | undefined => {
    if (!settings.functionCalling?.enabled) return undefined

    const enabledFunctions = getEnabledFunctionDeclarations()
    const functionDeclarations = filterFunctionsByAllowedNames(enabledFunctions, settings.functionCalling.allowedFunctionNames, 'useOllamaApi')

    if (functionDeclarations.length === 0) return undefined

    return functionDeclarations
      .filter((func) => func.name && func.description)
      .map((func) => ({
        type: 'function' as const,
        function: {
          name: func.name!,
          description: func.description!,
          parameters: func.parameters ? (convertGeminiSchemaToOpenAi(func.parameters) as Record<string, unknown>) : { type: 'object', properties: {} },
        },
      }))
  }

  /**
   * tool_choiceの設定
   */
  const getToolChoice = (settings: OllamaApiSettings, tools?: ChatCompletionTool[]): 'auto' | 'required' | 'none' | undefined => {
    if (!settings.functionCalling?.enabled || !tools || tools.length === 0) return undefined
    const mode = settings.functionCalling.mode
    if (mode === 'any') return 'required'
    if (mode === 'none') return 'none'
    return 'auto'
  }

  /**
   * Ollama API を非ストリーミングで呼び出す
   */
  const generateContent = async (messages: ChatMessage[], settings: OllamaApiSettings): Promise<OllamaCombinedResponse> => {
    const client = createOllamaClient(settings)
    const tools = buildTools(settings)

    try {
      const currentMessages = [...messages]

      // ダミープロンプト挿入
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', content: settings.dummyUserPrompt, timestamp: Date.now() })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'assistant', content: settings.dummyModelPrompt, timestamp: Date.now() })
      }

      const openaiMessages = toOpenAiMessages(currentMessages, settings)

      const response = await client.chat.completions.create({
        model: settings.model,
        messages: openaiMessages,
        ...(settings.temperature !== undefined && { temperature: settings.temperature }),
        ...(settings.maxTokens && { max_tokens: settings.maxTokens }),
        ...(settings.topP !== undefined && { top_p: settings.topP }),
        ...(tools && { tools }),
        ...(tools && { tool_choice: getToolChoice(settings, tools) }),
      })

      const choice = response.choices[0]
      if (!choice) {
        throw new Error('API応答が空です')
      }

      // Tool Call処理
      let toolCalls: FunctionCall[] = []
      let toolResults: FunctionCallResult[] = []

      const functionToolCalls = choice.message.tool_calls?.filter((tc): tc is Extract<typeof tc, { type: 'function' }> => tc.type === 'function')

      if (functionToolCalls && functionToolCalls.length > 0 && settings.functionCalling?.enabled) {
        toolCalls = functionToolCalls.map((tc) => ({
          name: tc.function.name,
          args: safeJsonParse(tc.function.arguments || '{}'),
        }))

        toolResults = await executeFunctionCallsCommon(toolCalls, {
          executeFunction,
          context: {
            messageId: generateMessageId(),
            timestamp: Date.now(),
            persistentMemory: chatStore.currentSession?.persistentMemory || {},
          },
          componentName: 'useOllamaApi',
          isStreaming: false,
        })

        // persistentMemoryを更新
        for (const result of toolResults) {
          if (result.context?.persistentMemory && chatStore.currentSession) {
            chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
          }
        }

        logFunctionCallCompletion(toolCalls, toolResults, 'useOllamaApi', '非ストリーミング')

        // Tool Call結果をメッセージに追加して再度API呼び出し
        if (toolCalls.length > 0) {
          openaiMessages.push({
            role: 'assistant',
            content: choice.message.content || null,
            tool_calls: functionToolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.function.name, arguments: tc.function.arguments },
            })),
          })

          toolResults.forEach((result, idx) => {
            const toolCallId = functionToolCalls[idx]?.id || `call_${idx}`
            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCallId,
              content: JSON.stringify(result.result || { error: result.error }),
            })
          })

          // 再度API呼び出し（ツールなし）
          const finalResponse = await client.chat.completions.create({
            model: settings.model,
            messages: openaiMessages,
            ...(settings.temperature !== undefined && { temperature: settings.temperature }),
            ...(settings.maxTokens && { max_tokens: settings.maxTokens }),
          })

          const finalChoice = finalResponse.choices[0]
          return {
            content: finalChoice?.message?.content || '',
            functionCalls: toolCalls,
            functionResults: toolResults,
          }
        }
      }

      return {
        content: choice.message.content || '',
        functionCalls: toolCalls.length > 0 ? toolCalls : undefined,
        functionResults: toolResults.length > 0 ? toolResults : undefined,
      }
    } catch (error: unknown) {
      const errorMessage = buildApiErrorMessage(error, 'Ollama API call failed', 'Ollama')
      throw new Error(errorMessage)
    }
  }

  /**
   * Ollama API をストリーミングで呼び出す
   */
  const generateContentStream = async function* (messages: ChatMessage[], settings: OllamaApiSettings) {
    const client = createOllamaClient(settings)
    const tools = buildTools(settings)

    try {
      const currentMessages = [...messages]

      // ダミープロンプト挿入
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', content: settings.dummyUserPrompt, timestamp: Date.now() })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'assistant', content: settings.dummyModelPrompt, timestamp: Date.now() })
      }

      const openaiMessages = toOpenAiMessages(currentMessages, settings)

      const stream = await client.chat.completions.create({
        model: settings.model,
        messages: openaiMessages,
        stream: true,
        ...(settings.temperature !== undefined && { temperature: settings.temperature }),
        ...(settings.maxTokens && { max_tokens: settings.maxTokens }),
        ...(settings.topP !== undefined && { top_p: settings.topP }),
        ...(tools && { tools }),
        ...(tools && { tool_choice: getToolChoice(settings, tools) }),
      })

      const accumulatedToolCalls: Array<{ id: string; name: string; arguments: string }> = []
      let accumulatedFunctionCalls: FunctionCall[] = []
      let accumulatedFunctionResults: FunctionCallResult[] = []

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (!delta) continue

        // テキストコンテンツ
        if (delta.content) {
          yield {
            type: 'chunk' as const,
            contentText: delta.content,
            functionCalls: accumulatedFunctionCalls.length > 0 ? accumulatedFunctionCalls : undefined,
            data: accumulatedFunctionResults.length > 0 ? { functionResults: accumulatedFunctionResults } : {},
          }
        }

        // Tool Call差分の蓄積
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index
            if (!accumulatedToolCalls[idx]) {
              accumulatedToolCalls[idx] = { id: tc.id || '', name: '', arguments: '' }
            }
            if (tc.id) accumulatedToolCalls[idx].id = tc.id
            if (tc.function?.name) accumulatedToolCalls[idx].name += tc.function.name
            if (tc.function?.arguments) accumulatedToolCalls[idx].arguments += tc.function.arguments
          }
        }
      }

      // ストリーミング完了後、Tool Callを実行
      if (accumulatedToolCalls.length > 0 && settings.functionCalling?.enabled) {
        const toolCalls: FunctionCall[] = accumulatedToolCalls.map((tc) => ({
          name: tc.name,
          args: safeJsonParse(tc.arguments || '{}'),
        }))

        const toolResults = await executeFunctionCallsCommon(toolCalls, {
          executeFunction,
          context: {
            messageId: generateMessageId(),
            timestamp: Date.now(),
            persistentMemory: chatStore.currentSession?.persistentMemory || {},
          },
          componentName: 'useOllamaApi',
          isStreaming: true,
        })

        // persistentMemoryを更新
        for (const result of toolResults) {
          if (result.context?.persistentMemory && chatStore.currentSession) {
            chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
          }
        }

        accumulatedFunctionCalls = toolCalls
        accumulatedFunctionResults = toolResults

        logFunctionCallCompletion(toolCalls, toolResults, 'useOllamaApi', 'ストリーミング')

        // Function Call情報をyield
        yield {
          type: 'chunk' as const,
          contentText: '',
          functionCalls: accumulatedFunctionCalls,
          data: { functionResults: accumulatedFunctionResults },
        }

        // Tool Call結果をメッセージに追加して再度ストリーミング
        openaiMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: accumulatedToolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        })

        toolResults.forEach((result, idx) => {
          openaiMessages.push({
            role: 'tool',
            tool_call_id: accumulatedToolCalls[idx]?.id || `call_${idx}`,
            content: JSON.stringify(result.result || { error: result.error }),
          })
        })

        // 最終応答をストリーミング
        const finalStream = await client.chat.completions.create({
          model: settings.model,
          messages: openaiMessages,
          stream: true,
          ...(settings.temperature !== undefined && { temperature: settings.temperature }),
          ...(settings.maxTokens && { max_tokens: settings.maxTokens }),
        })

        for await (const chunk of finalStream) {
          const delta = chunk.choices[0]?.delta
          if (delta?.content) {
            yield {
              type: 'chunk' as const,
              contentText: delta.content,
              functionCalls: accumulatedFunctionCalls,
              data: { functionResults: accumulatedFunctionResults },
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = buildApiErrorMessage(error, 'Ollama streaming API call failed', 'Ollama')
      throw new Error(errorMessage)
    }
  }

  /**
   * 利用可能なモデル一覧をOllama APIから取得
   */
  const getAvailableModels = async (baseUrl: string): Promise<string[]> => {
    // URLバリデーション
    const urlValidation = protocolRestrictedUrlSchema().safeParse(baseUrl)
    if (!urlValidation.success) {
      throw new Error('無効なURLです。http:// または https:// で始まるURLを入力してください。')
    }

    try {
      const response = await fetch(`${baseUrl}/api/tags`)
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }
      const data = (await response.json()) as { models?: Array<{ name: string }> }
      if (data.models && Array.isArray(data.models)) {
        return data.models.map((m) => m.name)
      }
      return []
    } catch (error) {
      logger.error('Ollamaモデル一覧の取得に失敗:', { component: 'useOllamaApi' }, error)
      throw error
    }
  }

  return {
    createOllamaClient,
    generateContent,
    generateContentStream,
    getAvailableModels,
  }
}

export type UseOllamaApiReturn = ReturnType<typeof useOllamaApi>

// テスト用エクスポート
export const _testing = {
  convertGeminiSchemaToOpenAi,
  convertGeminiTypeToOpenAiType,
  schemaConversionCache,
  MAX_CACHE_SIZE,
}
