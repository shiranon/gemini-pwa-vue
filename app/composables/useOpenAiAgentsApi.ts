import { Agent, assistant, run, setDefaultOpenAIClient, tool, user, type AgentInputItem, type ModelSettings, type NonStreamRunOptions, type StreamRunOptions } from '@openai/agents'
import { OpenAI } from 'openai'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { generateMessageId } from '~/lib/ids'
import { useChatStore } from '~/stores/chat'
import type { GeminiApiSettings, GeminiMessage } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/utils/logger'

/**
 * OpenAI Agents SDK のイベント型定義
 */
interface StreamEvent {
  type: string
  data?: {
    type?: string
    delta?: string
    [key: string]: unknown
  }
  delta?: string
  item_id?: string
  output_index?: number
  content_index?: number
}

/**
 * OpenAI APIレスポンスから思考プロセスを抽出する
 */
interface ThoughtExtractionResult {
  content: string
  thoughts?: string
}

/**
 * GPT-5 モデルの reasoning 設定
 */
export interface Gpt5ReasoningSettings {
  effort?: 'minimal' | 'low' | 'medium' | 'high'
}

/**
 * GPT-5 モデルの text verbosity 設定
 */
export interface Gpt5TextSettings {
  verbosity?: 'low' | 'medium' | 'high'
}

/**
 * GPT-5 モデル設定
 */
export interface Gpt5ModelSettings {
  reasoning?: Gpt5ReasoningSettings
  text?: Gpt5TextSettings
}

/**
 * OpenAI API 設定型（Gemini互換）
 */
export interface OpenAiApiSettings extends Omit<GeminiApiSettings, 'model'> {
  model: string // OpenAI model name
  baseURL?: string
  organization?: string
  // GPT-5 モデル専用設定
  modelSettings?: Gpt5ModelSettings
}

export interface OpenAiStreamingChunk {
  type: 'chunk'
  contentText: string
  thoughts?: string
  functionCalls?: FunctionCall[]
  data: Record<string, unknown> & {
    functionResults?: FunctionCallResult[]
  }
}

export type OpenAiCombinedResponse = {
  text: string
  thoughts?: string
  functionCalls?: FunctionCall[]
  functionResults?: FunctionCallResult[]
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * Agent実行結果からテキストを抽出
 * OpenAI Responses API形式に対応
 */
const extractTextFromResult = (result: unknown): string => {
  if (typeof result === 'string') return result
  if (result && typeof result === 'object') {
    // OpenAI Responses API形式: output配列から取得
    if ('output' in result && Array.isArray(result.output)) {
      for (const item of result.output) {
        if (item && typeof item === 'object' && 'type' in item && item.type === 'message') {
          if ('content' in item && Array.isArray(item.content)) {
            for (const contentItem of item.content) {
              if (contentItem && typeof contentItem === 'object' && 'type' in contentItem && contentItem.type === 'output_text' && 'text' in contentItem && typeof contentItem.text === 'string') {
                return contentItem.text
              }
            }
          }
        }
      }
    }

    // Check for text property
    if ('text' in result && typeof result.text === 'string') {
      return result.text
    }
    // Check for content property
    if ('content' in result && typeof result.content === 'string') {
      return result.content
    }
    // Check for message property
    if ('message' in result) {
      const msg = result.message
      if (typeof msg === 'string') return msg
      if (msg && typeof msg === 'object' && 'content' in msg && typeof msg.content === 'string') {
        return msg.content
      }
    }
  }
  return ''
}

/**
 * Gemini API の Type enum を OpenAI の文字列型に変換
 */
const convertGeminiTypeToOpenAiType = (type: unknown): string => {
  // Type.OBJECT などの enum 値は実際には "OBJECT" という文字列になっている
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
  return 'string' // デフォルト
}

/**
 * Gemini API のパラメータスキーマを OpenAI 形式に変換
 */
const convertGeminiSchemaToOpenAi = (schema: unknown): unknown => {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === 'type') {
      result[key] = convertGeminiTypeToOpenAiType(value)
    } else if (key === 'properties' && value && typeof value === 'object') {
      // properties内の各プロパティも再帰的に変換
      const properties: Record<string, unknown> = {}
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        properties[propKey] = convertGeminiSchemaToOpenAi(propValue)
      }
      result[key] = properties
    } else if (key === 'items' && value && typeof value === 'object') {
      // array の items も再帰的に変換
      result[key] = convertGeminiSchemaToOpenAi(value)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * OpenAI Agents APIを使用したチャット機能
 * Gemini APIと互換性のあるインターフェース
 */
export const useOpenAiAgentsApi = () => {
  const { getEnabledFunctionDeclarations, executeFunction } = useFunctionCalling()
  const chatStore = useChatStore()

  /**
   * Function Callsを記録するための配列（グローバル状態）
   */
  let recordedFunctionCalls: FunctionCall[] = []
  let recordedFunctionResults: FunctionCallResult[] = []

  /**
   * 記録をクリア
   */
  const clearFunctionCallRecords = () => {
    recordedFunctionCalls = []
    recordedFunctionResults = []
  }

  /**
   * OpenAI Agentを作成（ベストプラクティスに基づく簡潔な実装）
   */
  const createAgent = (settings: OpenAiApiSettings, systemInstruction?: string) => {
    const instructions = systemInstruction || settings.systemPrompt || 'You are a helpful assistant'

    // OpenAI Agents SDKのデフォルトクライアントを設定（ブラウザ環境対応）
    if (settings.apiKey) {
      const client = new OpenAI({
        apiKey: settings.apiKey,
        dangerouslyAllowBrowser: true,
      })
      setDefaultOpenAIClient(client)
    }

    // Function Callingが有効な場合、SDKのtool関数を使ってツールを設定
    const tools: ReturnType<typeof tool>[] = []

    if (settings.functionCalling?.enabled) {
      const enabledFunctions = getEnabledFunctionDeclarations()
      logger.info('[関数呼び出し] 有効な関数:', {
        component: 'useOpenAiAgentsApi',
        count: enabledFunctions.length,
        names: enabledFunctions.map((f) => f.name),
      })

      for (const func of enabledFunctions) {
        // allowedFunctionNamesでフィルタリング
        if (settings.functionCalling.allowedFunctionNames?.length) {
          if (!settings.functionCalling.allowedFunctionNames.includes(func.name || '')) {
            continue
          }
        }

        // Gemini API のスキーマを OpenAI 形式に変換
        const convertedParameters = func.parameters ? convertGeminiSchemaToOpenAi(func.parameters) : undefined

        // SDKのtool関数を使って適切なツールを作成
        const toolDefinition = tool({
          name: func.name || 'unknown',
          description: func.description || '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parameters: convertedParameters as any,
          strict: false,
          execute: async (input: unknown) => {
            // Function Callingの実行は既存のロジックを使用
            const functionCall: FunctionCall = {
              name: func.name || 'unknown',
              args: typeof input === 'string' ? JSON.parse(input) : (input as Record<string, unknown>),
            }

            logger.info('[OpenAI] tool.execute 開始:', { component: 'useOpenAiAgentsApi' }, functionCall)

            // Function Callを記録
            recordedFunctionCalls.push(functionCall)

            try {
              const result = await executeFunction(functionCall, {
                messageId: generateMessageId(),
                timestamp: Date.now(),
                persistentMemory: chatStore.currentSession?.persistentMemory || {},
              })

              logger.info('[OpenAI] tool.execute 完了:', { component: 'useOpenAiAgentsApi' }, result)

              // 結果を記録
              recordedFunctionResults.push(result)

              // persistentMemoryを更新
              if (result.context?.persistentMemory && chatStore.currentSession) {
                chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
              }

              return JSON.stringify(result.result || result.error || '')
            } catch (error) {
              logger.error('[OpenAI] tool.execute エラー:', { component: 'useOpenAiAgentsApi' }, error)

              const errorResult: FunctionCallResult = {
                name: functionCall.name,
                args: functionCall.args,
                result: null,
                error: error instanceof Error ? error.message : String(error),
              }

              // エラー結果も記録
              recordedFunctionResults.push(errorResult)

              return JSON.stringify({ error: errorResult.error })
            }
          },
        })

        tools.push(toolDefinition)
      }
    }

    // tool_choiceの設定（Function Calling modeに応じて）
    let toolChoice: 'auto' | 'required' | 'none' | undefined
    if (settings.functionCalling?.enabled && tools.length > 0) {
      const mode = settings.functionCalling.mode
      if (mode === 'any') {
        toolChoice = 'required' // 必ずツールを呼び出す
        logger.info('[useOpenAiAgentsApi] tool_choice: required (any mode)')
      } else if (mode === 'none') {
        toolChoice = 'none' // ツールを呼び出さない
        logger.info('[useOpenAiAgentsApi] tool_choice: none')
      } else {
        toolChoice = 'auto' // モデルが自動的に判断（デフォルト）
        logger.info('[useOpenAiAgentsApi] tool_choice: auto (auto mode)')
      }
    }

    const agentConfig: {
      name: string
      instructions: string
      model: string
      tools?: ReturnType<typeof tool>[]
      toolChoice?: 'auto' | 'required' | 'none'
      modelSettings?: ModelSettings
    } = {
      name: 'Assistant',
      instructions,
      model: settings.model,
      ...(tools.length > 0 && { tools }),
      ...(toolChoice && { toolChoice }),
    }

    // GPT-5モデルの場合、SDKの型定義を使用してモデル設定を追加
    if (settings.model.startsWith('gpt-5')) {
      const defaultGpt5Settings: Gpt5ModelSettings = {
        reasoning: { effort: 'low' },
        text: { verbosity: 'low' },
      }

      agentConfig.modelSettings = {
        reasoning: {
          effort: settings.modelSettings?.reasoning?.effort ?? defaultGpt5Settings.reasoning?.effort,
        },
        text: {
          verbosity: settings.modelSettings?.text?.verbosity ?? defaultGpt5Settings.text?.verbosity,
        },
      }
    }

    return new Agent(agentConfig)
  }

  /**
   * メッセージを OpenAI Agents SDK の AgentInputItem 配列に変換
   */
  const toAgentInputItems = (messages: GeminiMessage[]): AgentInputItem[] => {
    return messages.map((m) => {
      // parts から text を抽出
      const textParts = m.parts.filter((p) => 'text' in p)
      const content = textParts.map((p) => ('text' in p ? p.text : '')).join('\n')

      // user() または assistant() ヘルパー関数を使用
      // role が 'user' ならuser()、それ以外（'model' または 'assistant'）なら assistant()
      const result = m.role === 'user' ? user(content) : assistant(content)

      return result
    })
  }

  /**
   * OpenAI Agents API を非ストリーミングで呼び出す（Gemini互換）
   * ベストプラクティス: エラーハンドリングとリトライロジックの改善
   */
  const generateContent = async (
    messages: GeminiMessage[],
    _generationConfig: Record<string, unknown>,
    systemInstruction: { role: string; parts: Array<{ text: string }> } | null,
    settings: OpenAiApiSettings
  ): Promise<OpenAiCombinedResponse> => {
    try {
      // Function Calls記録をクリア
      clearFunctionCallRecords()

      // システムインストラクションを取得
      const systemPrompt = systemInstruction?.parts?.[0]?.text || settings.systemPrompt

      // Agentを作成
      const agent = createAgent(settings, systemPrompt)

      // メッセージを OpenAI 形式に変換
      const currentMessages = [...messages]

      // ダミープロンプト処理
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', parts: [{ text: settings.dummyUserPrompt }] })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'model', parts: [{ text: settings.dummyModelPrompt }] })
      }

      const agentInput = toAgentInputItems(currentMessages)

      if (agentInput.length === 0) {
        throw new Error('入力メッセージが空です')
      }

      logger.info('[OpenAI] generateContent 入力:', { component: 'useOpenAiAgentsApi' }, { inputCount: agentInput.length })

      // ベストプラクティス: 型安全なrun呼び出し
      const runOptions: NonStreamRunOptions = {
        stream: false,
      }

      const result = await run(agent, agentInput, runOptions)

      // レスポンスからテキストを抽出
      const text = extractTextFromResult(result)

      if (!text.trim()) {
        throw new Error('API応答が空です')
      }

      // 記録されたFunction Callsを取得
      logger.info('[OpenAI] generateContent - 記録されたFunction Calls:', {
        component: 'useOpenAiAgentsApi',
        functionCallsCount: recordedFunctionCalls.length,
        functionResultsCount: recordedFunctionResults.length,
        functionCalls: recordedFunctionCalls.map((fc) => ({ name: fc.name, hasArgs: Object.keys(fc.args).length > 0 })),
        functionResults: recordedFunctionResults.map((fr) => ({ name: fr.name, hasResult: !!fr.result, hasError: !!fr.error })),
      })

      const combined: OpenAiCombinedResponse = {
        text,
        functionCalls: recordedFunctionCalls.length > 0 ? [...recordedFunctionCalls] : undefined,
        functionResults: recordedFunctionResults.length > 0 ? [...recordedFunctionResults] : undefined,
      }

      return combined
    } catch (error: unknown) {
      // ベストプラクティス: より具体的なエラーメッセージ
      let errorMessage = 'OpenAI Agents API call failed'

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message)
      }

      // 特定のエラータイプに基づく詳細メッセージ
      if (errorMessage.includes('API key')) {
        errorMessage = 'OpenAI APIキーが無効または設定されていません'
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'OpenAI APIの利用制限に達しました'
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'OpenAI APIのレート制限に達しました'
      }

      throw new Error(errorMessage)
    }
  }

  /**
   * OpenAI Agents API をストリーミングで呼び出す（Gemini互換）
   * ベストプラクティス: ストリーミング処理の最適化とメモリ効率の改善
   */
  const generateContentStream = async function* (
    messages: GeminiMessage[],
    _generationConfig: Record<string, unknown>,
    systemInstruction: { role: string; parts: Array<{ text: string }> } | null,
    settings: OpenAiApiSettings
  ) {
    try {
      // Function Calls記録をクリア
      clearFunctionCallRecords()

      // システムインストラクションを取得
      const systemPrompt = systemInstruction?.parts?.[0]?.text || settings.systemPrompt

      // Agentを作成
      const agent = createAgent(settings, systemPrompt)

      // メッセージを OpenAI 形式に変換
      const currentMessages = [...messages]

      // ダミープロンプト処理
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', parts: [{ text: settings.dummyUserPrompt }] })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'model', parts: [{ text: settings.dummyModelPrompt }] })
      }

      const agentInput = toAgentInputItems(currentMessages)

      if (agentInput.length === 0) {
        throw new Error('入力メッセージが空です')
      }

      logger.info('[OpenAI] generateContentStream 入力:', { component: 'useOpenAiAgentsApi' }, { inputCount: agentInput.length })

      // ベストプラクティス: 型安全なストリーミング実行
      const streamOptions: StreamRunOptions = {
        stream: true,
      }

      const stream = await run(agent, agentInput, streamOptions)

      // Function Callsの前回の状態を追跡
      let lastFunctionCallsCount = 0
      let lastFunctionResultsCount = 0

      // ストリームからイベントを取得
      for await (const event of stream) {
        const streamEvent = event as StreamEvent

        // raw_model_stream_eventの場合、dataの中に実際のイベントがある
        const actualEventType = streamEvent.type === 'raw_model_stream_event' ? streamEvent.data?.type : streamEvent.type

        // テキストチャンクを処理 (OpenAI Agents APIの実際のイベント形式)
        if (actualEventType === 'output_text_delta') {
          const content = streamEvent.data?.delta || streamEvent.delta || ''

          if (content) {
            yield {
              type: 'chunk' as const,
              contentText: content,
              functionCalls: recordedFunctionCalls.length > 0 ? [...recordedFunctionCalls] : undefined,
              data: recordedFunctionResults.length > 0 ? { functionResults: [...recordedFunctionResults] } : {},
            }
          }
        }

        // Function Callsが更新された場合、chunkをyield
        if (recordedFunctionCalls.length > lastFunctionCallsCount || recordedFunctionResults.length > lastFunctionResultsCount) {
          logger.info('[OpenAI ストリーミング] Function Calls更新を検出:', {
            component: 'useOpenAiAgentsApi',
            previousCalls: lastFunctionCallsCount,
            currentCalls: recordedFunctionCalls.length,
            previousResults: lastFunctionResultsCount,
            currentResults: recordedFunctionResults.length,
          })

          lastFunctionCallsCount = recordedFunctionCalls.length
          lastFunctionResultsCount = recordedFunctionResults.length

          // Function Call情報を含むchunkをyield
          yield {
            type: 'chunk' as const,
            contentText: '',
            functionCalls: [...recordedFunctionCalls],
            data: { functionResults: [...recordedFunctionResults] },
          }
        }
      }

      // ストリーミング完了を待つ
      await stream.completed

      // 記録されたFunction Callsをログ出力
      logger.info('[OpenAI] generateContentStream - 記録されたFunction Calls:', {
        component: 'useOpenAiAgentsApi',
        functionCallsCount: recordedFunctionCalls.length,
        functionResultsCount: recordedFunctionResults.length,
        functionCalls: recordedFunctionCalls.map((fc) => ({ name: fc.name, hasArgs: Object.keys(fc.args).length > 0 })),
        functionResults: recordedFunctionResults.map((fr) => ({ name: fr.name, hasResult: !!fr.result, hasError: !!fr.error })),
      })

      // 最終チャンクを送信（Function Callがある場合のみ）
      if (recordedFunctionCalls.length > 0) {
        yield {
          type: 'chunk' as const,
          contentText: '',
          functionCalls: [...recordedFunctionCalls],
          data: { functionResults: [...recordedFunctionResults] },
        }
      }
    } catch (error: unknown) {
      // ベストプラクティス: より具体的なエラーメッセージ
      let errorMessage = 'OpenAI Agents streaming API call failed'

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message)
      }

      // 特定のエラータイプに基づく詳細メッセージ
      if (errorMessage.includes('API key')) {
        errorMessage = 'OpenAI APIキーが無効または設定されていません'
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'OpenAI APIの利用制限に達しました'
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'OpenAI APIのレート制限に達しました'
      }

      throw new Error(errorMessage)
    }
  }

  /**
   * 利用可能なモデル一覧を取得する（ベストプラクティス: 最新モデル優先）
   */
  const getAvailableModels = async (_apiKey: string): Promise<string[]> => {
    return [
      // GPT-5 models (最新・推奨)
      'gpt-5',
      'gpt‑5‑chat‑latest',
      'gpt-5-mini',
      'gpt-5-nano',
      // GPT-4o models (高性能)
      'gpt-4o',
      'gpt-4o-mini',
      // GPT-4 models
      'gpt-4-turbo',
      'gpt-4',
      // GPT-3.5 models (コスト効率)
      'gpt-3.5-turbo',
      // Reasoning models
      'o1',
      'o1-mini',
    ]
  }

  /**
   * レスポンスから思考プロセスを抽出する（Gemini互換）
   */
  const extractThoughtsFromResponse = (response: OpenAiCombinedResponse): ThoughtExtractionResult => {
    return {
      content: response.text,
      thoughts: response.thoughts,
    }
  }

  return {
    createAgent,
    generateContent,
    generateContentStream,
    getAvailableModels,
    extractThoughtsFromResponse,
  }
}

export type UseOpenAiAgentsApiReturn = ReturnType<typeof useOpenAiAgentsApi>
