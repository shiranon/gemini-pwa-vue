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
import { generateMessageId } from '~/lib/ids'
import type { GeminiApiSettings, GeminiMessage } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'

/**
 * Gemini APIレスポンスから思考プロセスを抽出する
 */
interface ThoughtExtractionResult {
  content: string
  thoughts?: string
}

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
  const buildToolConfig = (settings: GeminiApiSettings): { tools?: Tool[]; toolConfig?: ToolConfig } => {
    console.log('[関数呼び出し] 設定:', settings.functionCalling)

    const tools: Tool[] = []

    // 有効時のみFunction Callingツールを追加
    if (settings.functionCalling?.enabled) {
      const enabledFunctions = getEnabledFunctionDeclarations()
      console.log('[関数呼び出し] 有効な関数:', enabledFunctions)

      let functionDeclarations = enabledFunctions
      if (settings.functionCalling.allowedFunctionNames?.length) {
        const allowedSet = new Set(settings.functionCalling.allowedFunctionNames)
        const availableNames = new Set(enabledFunctions.map((declaration) => declaration.name).filter((name): name is string => typeof name === 'string'))
        const missingNames = settings.functionCalling.allowedFunctionNames.filter((name) => !availableNames.has(name))
        if (missingNames.length > 0) {
          console.warn('[関数呼び出し] allowedFunctionNamesに未登録の関数があります:', missingNames)
        }

        functionDeclarations = enabledFunctions.filter((declaration) => declaration.name && allowedSet.has(declaration.name))

        if (functionDeclarations.length !== enabledFunctions.length) {
          console.log('[関数呼び出し] allowedFunctionNamesで関数をフィルタリングしました', {
            before: enabledFunctions.length,
            after: functionDeclarations.length,
            allowedFunctionNames: settings.functionCalling.allowedFunctionNames,
          })
        }
      }

      if (functionDeclarations.length > 0) {
        tools.push({
          functionDeclarations: functionDeclarations as FunctionDeclaration[],
        })
      }
    } else {
      console.log('[関数呼び出し] Function Calling は無効です')
    }

    // Google Search tool (グラウンディングが有効時)
    if (settings.geminiEnableGrounding) {
      tools.push({ googleSearch: {} })
      console.log('[Google検索] ツールを有効化')
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

      toolConfig = {
        functionCallingConfig: {
          mode: modeMap[settings.functionCalling.mode],
          ...(settings.functionCalling.allowedFunctionNames && {
            allowedFunctionNames: settings.functionCalling.allowedFunctionNames,
          }),
        },
      }
      console.log('[関数呼び出し] ツール設定:', { tools, toolConfig })
    }

    return { tools, ...(toolConfig && { toolConfig }) }
  }

  /**
   * Function Calling を検出・実行する
   */
  const handleFunctionCalls = async (response: ResponseLike, messageId?: string): Promise<{ functionCalls: FunctionCall[]; functionResults: FunctionCallResult[] }> => {
    const functionCalls: FunctionCall[] = []
    const functionResults: FunctionCallResult[] = []

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (isFunctionCallPart(part)) {
          const args = part.functionCall.args && typeof part.functionCall.args === 'object' ? (part.functionCall.args as Record<string, unknown>) : {}
          const functionCall: FunctionCall = {
            name: part.functionCall.name,
            args,
          }
          functionCalls.push(functionCall)

          try {
            const result = await executeFunction(functionCall, {
              messageId,
              timestamp: Date.now(),
            })
            functionResults.push(result)
          } catch (error) {
            console.error('関数の実行に失敗:', error)
            functionResults.push({
              name: functionCall.name,
              args: functionCall.args,
              result: null,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      }
    }

    return { functionCalls, functionResults }
  }

  /**
   * Gemini API を非ストリーミングで呼び出す
   */
  const toContent = (messages: GeminiMessage[]): Content[] => {
    return messages.map((m) => {
      const parts: Part[] = m.parts.map((p) => {
        if ('text' in p) return { text: p.text }
        if ('functionCall' in p) return createPartFromFunctionCall(p.functionCall.name, (p.functionCall.args ?? {}) as Record<string, unknown>)
        if ('functionResponse' in p) return createPartFromFunctionResponse(generateMessageId(), p.functionResponse.name, (p.functionResponse.response ?? {}) as Record<string, unknown>)
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
      // 開発用に詳細なデバッグログを出力
      if (process.env.ENVIRONMENT === 'development') {
        const simplified = currentContents.map((c) => ({
          role: c.role,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          texts: (c.parts || []).map((p: Part) => ('text' in p ? (p as any).text : (p as any).functionCall ? `fc:${(p as any).functionCall.name}` : 'fr')),
        }))
        console.log('[GeminiAPI] generateContent 入力', simplified)
      }

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
          console.log('[関数呼び出し] 関数呼び出しを検出:', functionCalls)

          // Function Callがある場合、結果をAPIに送り返して最終回答を取得
          // 1. アシスタントのFunction Callレスポンスを追加
          const respLike = result
          if (respLike.candidates?.[0]?.content?.parts) {
            const parts = respLike.candidates![0]!.content!.parts as Part[]
            currentContents.push({ role: 'model', parts })
          }

          // 2. Function Call結果を追加
          for (const funcResult of functionResults) {
            const payload: Record<string, unknown> =
              funcResult && funcResult.result && typeof funcResult.result === 'object'
                ? (funcResult.result as Record<string, unknown>)
                : funcResult.error
                  ? { error: funcResult.error }
                  : ({} as Record<string, unknown>)
            const part = createPartFromFunctionResponse(generateMessageId(), funcResult.name, payload)
            currentContents.push({ role: 'function', parts: [part] })
          }

          // 3. Function Call結果を含めて再度API呼び出し
          console.log('[関数呼び出し] 関数結果をAPIへ送信')
          const finalResult = await genAI.models.generateContent({
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
      // 開発用に詳細なデバッグログを出力
      if (process.env.ENVIRONMENT === 'development') {
        const simplified = currentContents.map((c) => ({
          role: c.role,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          texts: (c.parts || []).map((p: Part) => ('text' in p ? (p as any).text : (p as any).functionCall ? `fc:${(p as any).functionCall.name}` : 'fr')),
        }))
        console.log('[GeminiAPI] generateContentStream 入力', simplified)
      }

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
          for (const functionCall of functionCalls) {
            try {
              const result = await executeFunction(functionCall, {
                messageId: generateMessageId(),
                timestamp: Date.now(),
              })
              accumulatedFunctionResults.push(result)
            } catch (error) {
              console.error('[ストリーミング] 関数の実行に失敗:', error)
              accumulatedFunctionResults.push({
                name: functionCall.name,
                args: functionCall.args,
                result: null,
                error: error instanceof Error ? error.message : String(error),
              })
            }
          }
          accumulatedFunctionCalls = [...accumulatedFunctionCalls, ...functionCalls]
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
        console.log('[ストリーミング関数呼び出し] 関数結果をAPIへ送信')

        // 1. アシスタントのFunction Callレスポンスを追加
        if (firstResponseParts.length > 0) {
          currentContents.push({
            role: 'model',
            parts: firstResponseParts as Part[],
          })
        }

        // 2. Function Call結果を追加
        for (const funcResult of accumulatedFunctionResults) {
          const payload: Record<string, unknown> =
            funcResult && funcResult.result && typeof funcResult.result === 'object'
              ? (funcResult.result as Record<string, unknown>)
              : funcResult.error
                ? { error: funcResult.error }
                : ({} as Record<string, unknown>)
          const part = createPartFromFunctionResponse(generateMessageId(), funcResult.name, payload)
          currentContents.push({ role: 'function', parts: [part] })
        }

        // 3. Function Call結果を含めて再度ストリーミング
        const finalResult = await genAI.models.generateContentStream({
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
   * APIキーの妥当性をチェックする
   */
  const validateApiKey = async (apiKey: string, model = 'gemini-2.5-flash'): Promise<boolean> => {
    try {
      const genAI = createGeminiClient(apiKey)
      await genAI.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        config: {
          maxOutputTokens: 1,
          safetySettings: buildSafetySettings(),
        },
      })

      return true
    } catch (error) {
      console.error('APIキーの検証に失敗:', error)
      return false
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
      console.error('利用可能なモデルの取得に失敗:', error)
      // フォールバック: 既知のモデル一覧を返す
      return ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']
    }
  }

  return {
    createGeminiClient,
    generateContent,
    generateContentStream,
    validateApiKey,
    getAvailableModels,
    extractThoughtsFromResponse,
  }
}

export type UseGeminiApiReturn = ReturnType<typeof useGeminiApi>
