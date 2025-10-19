import {
  createPartFromFunctionCall,
  createPartFromFunctionResponse,
  FunctionCallingConfigMode,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  type Candidate,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
  type Part,
  type Tool,
  type ToolConfig,
} from '@google/genai'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { executeFunctionCallsCommon, filterFunctionsByAllowedNames, logFunctionCallCompletion } from '~/lib/apiCommon'
import { generateMessageId } from '~/lib/ids'
import { useChatStore } from '~/stores/chat'
import type { ThoughtExtractionResult } from '~/types/api'
import type { GeminiApiSettings, GeminiMessage } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/utils/logger'

type ResponseLike = GenerateContentResponse

const isTextThoughtPart = (p: Part): p is Part & { text: string; thought?: boolean } => typeof (p as { text?: unknown }).text === 'string'
const isFunctionCallPart = (p: Part): p is Part & { functionCall: { name: string; args?: Record<string, unknown> } } =>
  typeof (p as { functionCall?: { name?: unknown } }).functionCall?.name === 'string'

const extractThoughtsFromResponse = (response: ResponseLike): ThoughtExtractionResult => {
  let content = ''
  let thoughts: string | undefined

  if (response.candidates && response.candidates[0]) {
    const candidate = response.candidates[0] as Candidate

    // メインコンテンツと思考プロセスを分離して取得
    if (candidate.content?.parts) {
      for (const part of candidate.content.parts as Part[]) {
        if (isTextThoughtPart(part)) {
          if (part.thought === true) {
            thoughts = part.text
          } else {
            content += part.text
          }
        }
      }
    }

    // レスポンスレベルでの思考プロセス確認
    const ct = candidate as { thinking?: string; thought?: string }
    if (ct.thinking || ct.thought) {
      thoughts = ct.thinking || ct.thought
    }

    // fallback: text アクセサ（プロパティ/関数どちらにも対応）
    if (!content) {
      const t = (response as { text?: string | (() => string) }).text
      if (typeof t === 'function') content = t() || ''
      else if (typeof t === 'string') content = t
    }
  }

  return { content, thoughts }
}

export interface StreamingChunk {
  type: 'chunk'
  contentText: string
  thoughts?: string
  functionCalls?: FunctionCall[]
  data: Record<string, unknown> & {
    functionResults?: FunctionCallResult[]
  }
}

export type CombinedResponse = ResponseLike & {
  functionCalls?: FunctionCall[]
  functionResults?: FunctionCallResult[]
}

export const useGeminiApi = () => {
  const { getEnabledFunctionDeclarations, executeFunction } = useFunctionCalling()
  const chatStore = useChatStore()
  const createGeminiClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey })
  }

  /**
   * セーフティ設定（常にOFF）を構築する
   */
  const buildSafetySettings = () => {
    return [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
    ]
  }

  /**
   * Function Calling用のツール設定を構築する
   */
  const buildToolConfig = (settings: GeminiApiSettings, overrideMode?: 'auto' | 'any' | 'none'): { tools?: Tool[]; toolConfig?: ToolConfig } => {
    logger.info('[関数呼び出し] 設定:', { component: 'useGeminiApi' }, settings.functionCalling?.enabled ? settings.functionCalling : '無効')

    const tools: Tool[] = []

    // 有効時のみFunction Callingツールを追加
    if (settings.functionCalling?.enabled) {
      const enabledFunctions = getEnabledFunctionDeclarations()

      // 共通関数を使用してフィルタリング
      const functionDeclarations = filterFunctionsByAllowedNames(enabledFunctions, settings.functionCalling.allowedFunctionNames, 'useGeminiApi')

      if (functionDeclarations.length > 0) {
        tools.push({
          functionDeclarations: functionDeclarations as FunctionDeclaration[],
        })
      }
    }

    // Google Search tool (グラウンディングが有効時)
    if (settings.geminiEnableGrounding) {
      tools.push({ googleSearch: {} })
    }

    // ツールが有効でない場合は空の設定を返す
    if (tools.length === 0) return {}

    // Function Callingが有効時のみtoolConfigを構築
    let toolConfig: ToolConfig | undefined
    if (settings.functionCalling?.enabled) {
      const modeMap = {
        auto: FunctionCallingConfigMode.AUTO,
        any: FunctionCallingConfigMode.ANY,
        none: FunctionCallingConfigMode.NONE,
      }

      // overrideModeが指定されている場合はそれを使用、そうでなければ設定値を使用
      const effectiveMode = overrideMode ?? settings.functionCalling.mode

      toolConfig = {
        functionCallingConfig: {
          mode: modeMap[effectiveMode],
          // allowedFunctionNamesはANYモードでのみ指定可能
          ...(effectiveMode === 'any' &&
            settings.functionCalling.allowedFunctionNames && {
              allowedFunctionNames: settings.functionCalling.allowedFunctionNames,
            }),
        },
      }
    }

    return { tools, ...(toolConfig && { toolConfig }) }
  }

  /**
   * Function Calling を検出・実行する
   */
  const handleFunctionCalls = async (response: ResponseLike, messageId?: string): Promise<{ functionCalls: FunctionCall[]; functionResults: FunctionCallResult[] }> => {
    const functionCalls: FunctionCall[] = []

    if (response.candidates?.[0]?.content?.parts) {
      for (let i = 0; i < response.candidates[0].content.parts.length; i++) {
        const part = response.candidates[0].content.parts[i]

        if (part && isFunctionCallPart(part)) {
          const args = part?.functionCall?.args && typeof part.functionCall.args === 'object' ? (part.functionCall.args as Record<string, unknown>) : {}
          const functionCall: FunctionCall = {
            name: part?.functionCall?.name || 'unknown',
            args,
          }
          functionCalls.push(functionCall)
        }
      }
    }

    // 共通関数を使用してFunction Callを実行
    const functionResults = await executeFunctionCallsCommon(functionCalls, {
      executeFunction,
      context: {
        messageId,
        timestamp: Date.now(),
        persistentMemory: chatStore.currentSession?.persistentMemory || {},
      },
      componentName: 'useGeminiApi',
      isStreaming: false,
    })

    // persistentMemoryを更新
    for (const result of functionResults) {
      if (result.context?.persistentMemory && chatStore.currentSession) {
        chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
      }
    }

    // 共通関数を使用してログ出力
    logFunctionCallCompletion(functionCalls, functionResults, 'useGeminiApi', '非ストリーミング')

    return { functionCalls, functionResults }
  }

  /**
   * Gemini API を非ストリーミングで呼び出す
   */
  const toContent = (messages: GeminiMessage[]): Content[] => {
    const lastIndex = messages.length - 1
    return messages.map((m, index) => {
      const isLatestMessage = index === lastIndex
      const parts: Part[] = m.parts.map((p) => {
        if ('text' in p) return { text: p.text }
        if ('functionCall' in p) return createPartFromFunctionCall(p.functionCall.name, (p.functionCall.args ?? {}) as Record<string, unknown>)
        if ('functionResponse' in p) return createPartFromFunctionResponse(generateMessageId(), p.functionResponse.name, (p.functionResponse.response ?? {}) as Record<string, unknown>)
        // 最新メッセージ以外のinlineDataは除外してトークンを節約
        if ('inlineData' in p) {
          if (isLatestMessage) {
            return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } }
          }
          // 添付ファイルがあったことを示すプレースホルダーテキストに置き換え
          return { text: '[添付ファイル]' }
        }
        return { text: '' }
      })
      return { role: m.role, parts }
    })
  }

  const generateContent = async (messages: GeminiMessage[], generationConfig: Record<string, unknown>, systemInstruction: Content | null, settings: GeminiApiSettings): Promise<CombinedResponse> => {
    const genAI = createGeminiClient(settings.apiKey)
    const toolConfig = buildToolConfig(settings)

    try {
      // メッセージをContent型に変換して変更可能にする
      const currentMessages = [...messages]
      // 送信直前のダミー挿入（初回呼び出し時のみ）
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', parts: [{ text: settings.dummyUserPrompt }] })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'model', parts: [{ text: settings.dummyModelPrompt }] })
      }
      const currentContents: Content[] = toContent(currentMessages)

      const result = await genAI.models.generateContent({
        model: settings.model,
        contents: currentContents,
        config: {
          ...(generationConfig as Record<string, unknown>),
          ...(systemInstruction && { systemInstruction }),
          ...(toolConfig.tools && { tools: toolConfig.tools }),
          ...(toolConfig.toolConfig && { toolConfig: toolConfig.toolConfig }),
          safetySettings: buildSafetySettings(),
        },
      })

      // Function Callingの処理
      let functionCalls: FunctionCall[] = []
      let functionResults: FunctionCallResult[] = []

      if (settings.functionCalling?.enabled) {
        const fcResult = await handleFunctionCalls(result, generateMessageId())
        functionCalls = fcResult.functionCalls
        functionResults = fcResult.functionResults

        if (functionCalls.length > 0) {
          // Function Callがある場合、結果をAPIに送り返して最終回答を取得
          // Function Call結果を追加
          for (let i = 0; i < functionResults.length; i++) {
            const funcResult = functionResults[i]
            if (!funcResult) continue

            const payload: Record<string, unknown> =
              funcResult && funcResult.result && typeof funcResult.result === 'object'
                ? (funcResult.result as Record<string, unknown>)
                : funcResult.error
                  ? { error: funcResult.error }
                  : ({} as Record<string, unknown>)

            const part = createPartFromFunctionResponse(generateMessageId(), funcResult.name, payload)
            currentContents.push({ role: 'function', parts: [part] })
          }

          // Function Call結果送信時はNONEモードを使用
          const resultToolConfig = buildToolConfig(settings, 'none')

          const finalResult = await genAI.models.generateContent({
            model: settings.model,
            contents: currentContents,
            config: {
              ...(generationConfig as Record<string, unknown>),
              ...(systemInstruction && { systemInstruction }),
              ...(resultToolConfig.tools && { tools: resultToolConfig.tools }),
              ...(resultToolConfig.toolConfig && { toolConfig: resultToolConfig.toolConfig }),
              safetySettings: buildSafetySettings(),
            },
          })

          // 最終的なレスポンスを返す（Function Call情報も含める）
          const combined: CombinedResponse = Object.assign({}, finalResult, {
            functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
            functionResults: functionResults.length > 0 ? functionResults : undefined,
          })
          return combined
        }
      }

      // Function Callがない場合は通常のレスポンスを返す
      const combined: CombinedResponse = Object.assign({}, result, {
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        functionResults: functionResults.length > 0 ? functionResults : undefined,
      })
      return combined
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gemini API call failed'
      throw new Error(errorMessage)
    }
  }

  /**
   * Gemini API をストリーミングで呼び出す
   */
  const generateContentStream = async function* (messages: GeminiMessage[], generationConfig: Record<string, unknown>, systemInstruction: Content | null, settings: GeminiApiSettings) {
    const genAI = createGeminiClient(settings.apiKey)
    const toolConfig = buildToolConfig(settings)

    try {
      // メッセージをContent型に変換して変更可能にする
      const currentMessages = [...messages]
      // 送信直前のダミー挿入（初回ストリーミング呼び出しのみ）
      if (settings.enableDummyUserPrompt && settings.dummyUserPrompt?.trim()) {
        currentMessages.push({ role: 'user', parts: [{ text: settings.dummyUserPrompt }] })
      }
      if (settings.enableDummyModelPrompt && settings.dummyModelPrompt?.trim()) {
        currentMessages.push({ role: 'model', parts: [{ text: settings.dummyModelPrompt }] })
      }
      const currentContents: Content[] = toContent(currentMessages)

      const result = await genAI.models.generateContentStream({
        model: settings.model,
        contents: currentContents,
        config: {
          ...(generationConfig as Record<string, unknown>),
          ...(systemInstruction && { systemInstruction }),
          ...(toolConfig.tools && { tools: toolConfig.tools }),
          ...(toolConfig.toolConfig && { toolConfig: toolConfig.toolConfig }),
          safetySettings: buildSafetySettings(),
        },
      })

      let accumulatedFunctionCalls: FunctionCall[] = []
      const accumulatedFunctionResults: FunctionCallResult[] = []
      let firstResponseParts: unknown[] = []
      let hasFunction = false

      for await (const chunk of result) {
        // ストリーミング時のコンテンツと思考プロセスを分離
        let contentText = ''
        let thoughts: string | undefined
        const functionCalls: FunctionCall[] = []

        const respLike = chunk as ResponseLike
        if (respLike.candidates?.[0]?.content?.parts) {
          // 最初のレスポンスのpartsを保存（Function Call結果送信時に必要）
          const parts = respLike.candidates![0]!.content!.parts!
          if (!hasFunction && parts.some((part) => isFunctionCallPart(part))) {
            firstResponseParts = parts
            hasFunction = true
          }

          for (const part of parts) {
            if (isTextThoughtPart(part)) {
              // thought: true の場合は思考プロセス、そうでなければメインコンテンツ
              if (part.thought === true) {
                thoughts = part.text
              } else {
                contentText += part.text
              }
            }

            // Function Call を検出
            if (isFunctionCallPart(part)) {
              const functionCall: FunctionCall = {
                name: part.functionCall.name,
                args: part.functionCall.args && typeof part.functionCall.args === 'object' ? (part.functionCall.args as Record<string, unknown>) : {},
              }
              functionCalls.push(functionCall)
            }
          }
        } else {
          // フォールバック: 従来の方法
          const textProvider = chunk as { text?: () => string }
          contentText = typeof textProvider.text === 'function' ? textProvider.text() || '' : ''
        }

        // Function Call を実行
        if (functionCalls.length > 0 && settings.functionCalling?.enabled) {
          logger.info('[ストリーミング] Function Call検出:', {
            newFunctionCalls: functionCalls,
            currentAccumulatedCalls: accumulatedFunctionCalls.length,
            currentAccumulatedResults: accumulatedFunctionResults.length,
          })

          // Function Callを先に追加
          accumulatedFunctionCalls = [...accumulatedFunctionCalls, ...functionCalls]
          logger.info('[ストリーミング] Function Call追加後:', {
            totalCalls: accumulatedFunctionCalls.length,
            totalResults: accumulatedFunctionResults.length,
          })

          // 共通関数を使用してFunction Callを実行
          const newResults = await executeFunctionCallsCommon(functionCalls, {
            executeFunction,
            context: {
              messageId: generateMessageId(),
              timestamp: Date.now(),
              persistentMemory: chatStore.currentSession?.persistentMemory || {},
            },
            componentName: 'useGeminiApi',
            isStreaming: true,
          })

          // 結果を蓄積
          accumulatedFunctionResults.push(...newResults)

          // persistentMemoryを更新
          for (const result of newResults) {
            if (result.context?.persistentMemory && chatStore.currentSession) {
              chatStore.currentSession.persistentMemory = result.context.persistentMemory as typeof chatStore.currentSession.persistentMemory
            }
          }

          logger.info('[ストリーミング] Function Result追加後:', {
            totalCalls: accumulatedFunctionCalls.length,
            totalResults: accumulatedFunctionResults.length,
          })
        }

        if (contentText || thoughts || functionCalls.length > 0 || accumulatedFunctionCalls.length > 0) {
          yield {
            type: 'chunk' as const,
            contentText,
            thoughts,
            functionCalls: accumulatedFunctionCalls.length > 0 ? accumulatedFunctionCalls : undefined,
            data: accumulatedFunctionResults.length > 0 ? { functionResults: accumulatedFunctionResults } : {},
          }
        }
      }

      // Function Callがある場合、結果をAPIに送り返して最終回答をストリーミング
      if (accumulatedFunctionCalls.length > 0 && settings.functionCalling?.enabled) {
        logger.info('[ストリーミング関数呼び出し] 関数結果をAPIへ送信', {
          functionCallsCount: accumulatedFunctionCalls.length,
          functionResultsCount: accumulatedFunctionResults.length,
          functionCalls: accumulatedFunctionCalls.map((fc) => ({ name: fc.name, args: fc.args })),
          functionResults: accumulatedFunctionResults.map((fr) => ({ name: fr.name, hasResult: !!fr.result, hasError: !!fr.error })),
        })

        // 共通関数を使用してFunction CallとResultの数を検証
        // (既にaccumulatedで一致を保証しているため、このチェックは不要だが念のため残す)

        // 1. アシスタントのFunction Callレスポンスを追加
        // Function Callパーツの追加をスキップ（既にcurrentContentsに含まれているため）
        logger.info('[ストリーミング] Function Callパーツの追加をスキップ（既存のパーツを使用）', {
          firstResponsePartsLength: firstResponseParts.length,
        })

        // 2. Function Call結果を追加
        logger.info('[ストリーミング] Function Response作成開始:', {
          resultsCount: accumulatedFunctionResults.length,
          results: accumulatedFunctionResults.map((fr) => ({ name: fr.name, hasResult: !!fr.result, hasError: !!fr.error })),
        })

        for (let i = 0; i < accumulatedFunctionResults.length; i++) {
          const funcResult = accumulatedFunctionResults[i]
          if (!funcResult) continue
          logger.info(`[ストリーミング] Function Response ${i + 1}/${accumulatedFunctionResults.length}:`, { component: 'useGeminiApi' }, funcResult.name, funcResult)

          const payload: Record<string, unknown> =
            funcResult && funcResult.result && typeof funcResult.result === 'object'
              ? (funcResult.result as Record<string, unknown>)
              : funcResult.error
                ? { error: funcResult.error }
                : ({} as Record<string, unknown>)

          logger.info(`[ストリーミング] Function Response ${i + 1} payload:`, payload)
          const part = createPartFromFunctionResponse(generateMessageId(), funcResult.name, payload)
          currentContents.push({ role: 'function', parts: [part] })
          logger.info(`[ストリーミング] Function Response ${i + 1} 追加完了`, { component: 'useGeminiApi' })
        }

        // 3. Function Call結果を含めて再度ストリーミング
        logger.info('[ストリーミング] Gemini API送信前の最終状態:', {
          currentContentsLength: currentContents.length,
          functionCallParts: currentContents.filter((c) => c.role === 'model').length,
          functionResponseParts: currentContents.filter((c) => c.role === 'function').length,
          currentContents: currentContents.map((c) => ({ role: c.role, partsCount: c.parts?.length || 0 })),
        })

        // Function Call結果送信時はNONEモードを使用（ANYモードから切り替え）
        const resultToolConfig = buildToolConfig(settings, 'none')

        const finalResult = await genAI.models.generateContentStream({
          model: settings.model,
          contents: currentContents,
          config: {
            ...(generationConfig as Record<string, unknown>),
            ...(systemInstruction && { systemInstruction }),
            ...(resultToolConfig.tools && { tools: resultToolConfig.tools }),
            ...(resultToolConfig.toolConfig && { toolConfig: resultToolConfig.toolConfig }),
            safetySettings: buildSafetySettings(),
          },
        })

        for await (const chunk of finalResult) {
          const respLike: GenerateContentResponse = chunk
          let contentText = ''
          let thoughts: string | undefined

          if (respLike.candidates?.[0]?.content?.parts) {
            for (const part of respLike.candidates[0].content.parts as Part[]) {
              if (isTextThoughtPart(part)) {
                if (part.thought === true) {
                  thoughts = part.text
                } else {
                  contentText += part.text
                }
              }
            }
          } else {
            const tVal = (respLike as GenerateContentResponse).text
            contentText = typeof tVal === 'string' ? tVal || '' : ''
          }

          if (contentText || thoughts) {
            yield {
              type: 'chunk' as const,
              contentText,
              thoughts,
              functionCalls: accumulatedFunctionCalls,
              data: { functionResults: accumulatedFunctionResults },
            }
          }
        }
      }

      // ストリーミング完了時にFunction Call結果を最終的に返す
      if (accumulatedFunctionCalls.length > 0) {
        yield {
          type: 'chunk' as const,
          contentText: '',
          functionCalls: accumulatedFunctionCalls,
          data: { functionResults: accumulatedFunctionResults },
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gemini streaming API call failed'
      throw new Error(errorMessage)
    }
  }

  /**
   * 利用可能なモデル一覧を取得する
   */
  const getAvailableModels = async (apiKey: string): Promise<string[]> => {
    try {
      const genAI = createGeminiClient(apiKey)
      const pager = await genAI.models.list()

      const names: string[] = []
      for await (const item of pager) {
        if (item && typeof item === 'object' && 'name' in item) {
          const modelName = (item as { name?: string }).name
          if (typeof modelName === 'string' && modelName.includes('gemini')) {
            names.push(modelName.replace(/^models\//, ''))
          }
        }
      }

      const unique = Array.from(new Set(names))
      return unique
    } catch (error) {
      logger.error('利用可能なモデルの取得に失敗:', { component: 'useGeminiApi' }, error)
      // フォールバック: 既知のモデル一覧を返す
      return ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']
    }
  }

  return {
    createGeminiClient,
    generateContent,
    generateContentStream,
    getAvailableModels,
    extractThoughtsFromResponse,
  }
}

export type UseGeminiApiReturn = ReturnType<typeof useGeminiApi>
