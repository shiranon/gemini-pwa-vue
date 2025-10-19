import { useGeminiApi } from '~/composables/useGeminiApi'
import { logger } from '~/utils/logger'

export interface SummaryOptions {
  apiKey: string
  model: string
  systemInstruction?: string
}

/**
 * 与えられたチャット履歴をGeminiで要約する
 */
export async function summarizeChatHistory(messages: Array<{ role: string; content: string }>, options: SummaryOptions): Promise<string> {
  const { apiKey, model, systemInstruction } = options

  if (!messages || messages.length === 0) {
    return ''
  }

  logger.info('要約処理を実行', { messageCount: messages.length, options })

  const api = useGeminiApi()
  const client = api.createGeminiClient(apiKey)

  const sys = systemInstruction?.trim()
  const instruction =
    sys && sys.length > 0
      ? sys
      : 'あなたは優秀な要約者です。与えられた会話履歴を簡潔で分かりやすい要約にまとめてください。重要なポイントや決定事項、次のアクションなどを明確に示してください。要約のみを出力し、余計な説明は不要です。'

  // チャット履歴をテキスト形式に変換
  const chatHistory = messages.map((msg) => `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`).join('\n\n')

  const resp = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `以下の会話履歴を要約してください:\n\n${chatHistory}`,
          },
        ],
      },
    ],
    config: {
      ...(instruction && { systemInstruction: { role: 'user', parts: [{ text: instruction }] } }),
      thinkingConfig: { includeThoughts: false },
    },
  })

  const candidate = resp.candidates?.[0] as { content?: { parts?: Array<{ text?: string }> }; finishReason?: string } | undefined
  const parts = candidate?.content?.parts

  // トークン制限やその他の問題で要約が失敗した場合は空文字を返す
  if (!parts || parts.length === 0 || candidate?.finishReason === 'MAX_TOKENS') {
    logger.warn('要約が不完全または失敗:', {
      finishReason: candidate?.finishReason,
      hasParts: !!parts?.length,
    })
    return ''
  }

  const output =
    parts
      ?.map((p) => p.text || '')
      .join('')
      ?.trim() || ''

  return output
}
