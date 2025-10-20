import { useGeminiApi } from '~/composables/useGeminiApi'
import { logger } from '~/lib/logger'
export interface ProofreadOptions {
  apiKey: string
  model: string
  systemInstruction?: string
}

/**
 * 与えられた日本語テキストをGeminiで校正する
 */
export async function proofreadText(text: string, options: ProofreadOptions): Promise<string> {
  const { apiKey, model, systemInstruction } = options
  const trimmed = text?.trim() || ''
  if (!trimmed) return ''

  logger.info('校正処理を実行', { text, options })

  const api = useGeminiApi()
  const client = api.createGeminiClient(apiKey)

  const sys = systemInstruction?.trim()
  const instruction =
    sys && sys.length > 0
      ? sys
      : 'あなたは優れた日本語の校正者です。以下のテキストの誤字脱字、文法、語彙、読みやすさを改善し、意味を変えずに自然で明瞭な日本語に整えてください。出力は校正後の本文のみを返し、余計な説明は含めないでください。'

  const resp = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `以下のテキストを校正してください。出力は校正後の本文のみ:\n\n${trimmed}`,
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

  // トークン制限やその他の問題で校正が失敗した場合は元の文章を返す
  if (!parts || parts.length === 0 || candidate?.finishReason === 'MAX_TOKENS') {
    logger.warn('校正が不完全または失敗:', {
      finishReason: candidate?.finishReason,
      hasParts: !!parts?.length,
    })
    return text
  }

  const output =
    parts
      ?.map((p) => p.text || '')
      .join('')
      ?.trim() || ''
  return output || text
}
