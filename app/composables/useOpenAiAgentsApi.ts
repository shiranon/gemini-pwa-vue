import { Agent, run, setDefaultOpenAIClient, tool, user, assistant, type ModelSettings, type NonStreamRunOptions, type StreamRunOptions, type AgentInputItem } from '@openai/agents'
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
  data?: unknown
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
 * OpenAI Agents APIを使用したチャット機能
 * Gemini APIと互換性のあるインターフェース
 */
export const useOpenAiAgentsApi = () => {
  const { getEnabledFunctionDeclarations, executeFunction } = useFunctionCalling()
  const chatStore = useChatStore()

  /**
   * OpenAI Agentを作成（ベストプラクティスに基づく簡潔な実装）
   */
  const createAgent = (settings: OpenAiApiSettings, systemInstruction?: string) => {
    const instructions = systemInstruction || settings.systemPrompt || 'You are a helpful assistant'

    // デバッグ: APIキーの確認
    logger.info('[useOpenAiAgentsApi] createAgent 設定確認:', {
      component: 'useOpenAiAgentsApi',
      apiKey: settings.apiKey ? `設定済み(${settings.apiKey.substring(0, 10)}...)` : '未設定',
      apiKeyLength: settings.apiKey?.length || 0,
      model: settings.model,
    })

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

        // SDKのtool関数を使って適切なツールを作成
        const toolDefinition = tool({
          name: func.name || 'unknown',
          description: func.description || '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parameters: func.parameters ? (func.parameters as any) : undefined,
          strict: false,
          execute: async (input: unknown) => {
            // Function Callingの実行は既存のロジックを使用
            const functionCall: FunctionCall = {
              name: func.name || 'unknown',
              args: typeof input === 'string' ? JSON.parse(input) : input,
            }

            const result = await executeFunction(functionCall, {
              messageId: generateMessageId(),
              timestamp: Date.now(),
              persistentMemory: chatStore.currentSession?.persistentMemory || {},
            })

            return JSON.stringify(result.result || result.error || '')
          },
        })

        tools.push(toolDefinition)
      }
    }

    const agentConfig: {
      name: string
      instructions: string
      model: string
      tools?: ReturnType<typeof tool>[]
      modelSettings?: ModelSettings
    } = {
      name: 'Assistant',
      instructions,
      model: settings.model,
      ...(tools.length > 0 && { tools }),
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
   * Function Calling を検出・実行する
   */
  const handleFunctionCalls = async (events: StreamEvent[], messageId?: string): Promise<{ functionCalls: FunctionCall[]; functionResults: FunctionCallResult[] }> => {
    logger.info('[OpenAI] Function Calling処理開始:', { messageId })
    const functionCalls: FunctionCall[] = []
    const functionResults: FunctionCallResult[] = []

    for (const event of events) {
      // tool_call イベントを検出
      if (event.type === 'tool_call') {
        const toolCall = event.data as { name: string; arguments: Record<string, unknown> }
        const functionCall: FunctionCall = {
          name: toolCall.name,
          args: toolCall.arguments || {},
        }
        logger.info(`[OpenAI] Function Call検出:`, { component: 'useOpenAiAgentsApi' }, functionCall)
        functionCalls.push(functionCall)

        try {
          logger.info(`[OpenAI] 関数実行開始:`, { component: 'useOpenAiAgentsApi' }, functionCall.name)
          const result = await executeFunction(functionCall, {
            messageId,
            timestamp: Date.now(),
            persistentMemory: chatStore.currentSession?.persistentMemory || {},
          })
          logger.info(`[OpenAI] 関数実行完了:`, { component: 'useOpenAiAgentsApi' }, functionCall.name, result)
          functionResults.push(result)

          // persistentMemoryを更新
          if (result.context?.persistentMemory && chatStore.currentSession) {
            chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
          }
        } catch (error) {
          logger.error(`[OpenAI] 関数の実行に失敗:`, { component: 'useOpenAiAgentsApi' }, functionCall.name, error)
          const errorResult = {
            name: functionCall.name,
            args: functionCall.args,
            result: null,
            error: error instanceof Error ? error.message : String(error),
          }
          functionResults.push(errorResult)
        }
      }
    }

    logger.info('[OpenAI] Function Calling処理完了:', {
      functionCallsCount: functionCalls.length,
      functionResultsCount: functionResults.length,
    })

    return { functionCalls, functionResults }
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

      // デバッグ: レスポンスの中身を確認
      logger.info('[OpenAI] generateContent レスポンス:', { component: 'useOpenAiAgentsApi' }, result)

      // レスポンスからテキストを抽出
      const text = extractTextFromResult(result)

      // デバッグ: 抽出されたテキストを確認
      logger.info('[OpenAI] 抽出されたテキスト:', { component: 'useOpenAiAgentsApi' }, { text, textLength: text.length })

      if (!text.trim()) {
        throw new Error('API応答が空です')
      }

      // Function Callsの処理（イベントから抽出）
      let functionCalls: FunctionCall[] = []
      let functionResults: FunctionCallResult[] = []

      if (settings.functionCalling?.enabled && result && typeof result === 'object' && 'events' in result) {
        const events = ((result as { events?: StreamEvent[] }).events as StreamEvent[]) || []
        const fcResult = await handleFunctionCalls(events, generateMessageId())
        functionCalls = fcResult.functionCalls
        functionResults = fcResult.functionResults

        // Function Callがある場合、結果を含めて再実行
        if (functionCalls.length > 0) {
          logger.info('[OpenAI] 関数結果を含めて再実行')
          // TODO: Function Call結果を含めた再実行の実装
          // OpenAI Agents SDKでは自動的に処理されるため、ここでは追加処理不要の可能性あり
        }
      }

      const combined: OpenAiCombinedResponse = {
        text,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        functionResults: functionResults.length > 0 ? functionResults : undefined,
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

      // メモリ効率の改善: 必要最小限のデータのみ保持
      const accumulatedFunctionCalls: FunctionCall[] = []
      const accumulatedFunctionResults: FunctionCallResult[] = []

      // ストリームからイベントを取得
      for await (const event of stream) {
        const streamEvent = event as StreamEvent

        // テキストチャンクを処理
        if (streamEvent.type === 'raw_model_stream_event') {
          const data = streamEvent.data as { choices?: Array<{ delta?: { content?: string } }> }
          const content = data.choices?.[0]?.delta?.content || ''

          if (content) {
            yield {
              type: 'chunk' as const,
              contentText: content,
              functionCalls: accumulatedFunctionCalls.length > 0 ? [...accumulatedFunctionCalls] : undefined,
              data: accumulatedFunctionResults.length > 0 ? { functionResults: [...accumulatedFunctionResults] } : {},
            }
          }
        }

        // Function Call を検出
        if (streamEvent.type === 'tool_call' && settings.functionCalling?.enabled) {
          const toolCall = streamEvent.data as { name: string; arguments: Record<string, unknown> }
          const functionCall: FunctionCall = {
            name: toolCall.name,
            args: toolCall.arguments || {},
          }

          logger.info('[OpenAI ストリーミング] Function Call検出:', { component: 'useOpenAiAgentsApi' }, functionCall)
          accumulatedFunctionCalls.push(functionCall)

          try {
            const result = await executeFunction(functionCall, {
              messageId: generateMessageId(),
              timestamp: Date.now(),
              persistentMemory: chatStore.currentSession?.persistentMemory || {},
            })
            logger.info('[OpenAI ストリーミング] 関数実行完了:', { component: 'useOpenAiAgentsApi' }, functionCall.name, result)
            accumulatedFunctionResults.push(result)

            // persistentMemoryを更新
            if (result.context?.persistentMemory && chatStore.currentSession) {
              chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
            }

            yield {
              type: 'chunk' as const,
              contentText: '',
              functionCalls: [...accumulatedFunctionCalls],
              data: { functionResults: [...accumulatedFunctionResults] },
            }
          } catch (error) {
            logger.error('[OpenAI ストリーミング] 関数の実行に失敗:', { component: 'useOpenAiAgentsApi' }, functionCall.name, error)
            const errorResult = {
              name: functionCall.name,
              args: functionCall.args,
              result: null,
              error: error instanceof Error ? error.message : String(error),
            }
            accumulatedFunctionResults.push(errorResult)
          }
        }
      }

      // ストリーミング完了を待つ
      await stream.completed

      // 最終チャンクを送信（Function Callがある場合のみ）
      if (accumulatedFunctionCalls.length > 0) {
        yield {
          type: 'chunk' as const,
          contentText: '',
          functionCalls: [...accumulatedFunctionCalls],
          data: { functionResults: [...accumulatedFunctionResults] },
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
   * APIキーの妥当性をチェックする（ベストプラクティス: 軽量な検証）
   */
  const validateApiKey = async (apiKey: string, model = 'gpt-4o-mini'): Promise<boolean> => {
    try {
      if (!apiKey || !apiKey.trim()) {
        return false
      }

      const settings: OpenAiApiSettings = {
        apiKey,
        model,
        temperature: 0.1, // 低い温度で高速化
        maxTokens: 5, // 最小限のトークン数
        topK: 1,
        topP: 0.1,
        systemPrompt: '',
        streamingOutput: false,
      }

      const agent = createAgent(settings, 'You are a helpful assistant')

      const validationOptions: NonStreamRunOptions = {
        stream: false,
      }

      await run(agent, 'Hi', validationOptions)

      return true
    } catch (error) {
      logger.error('APIキーの検証に失敗:', { component: 'useOpenAiAgentsApi' }, error)
      return false
    }
  }

  /**
   * 利用可能なモデル一覧を取得する（ベストプラクティス: 最新モデル優先）
   */
  const getAvailableModels = async (_apiKey: string): Promise<string[]> => {
    return [
      // GPT-5 models (最新・推奨)
      'gpt-5',
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
    validateApiKey,
    getAvailableModels,
    extractThoughtsFromResponse,
  }
}

export type UseOpenAiAgentsApiReturn = ReturnType<typeof useOpenAiAgentsApi>
