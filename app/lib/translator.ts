import { useGeminiApi } from '~/composables/useGeminiApi'
import type { GeminiApiSettings } from '~/types/chat'
export type TranslationProvider = 'gemini' | 'deepl'

export interface TranslateThoughtsOptions {
  provider: TranslationProvider
  text: string
  settings: Pick<GeminiApiSettings, 'apiKey' | 'thoughtTranslationModel' | 'deeplApiKey'>
  targetLang?: string
}

/**
 * 思考プロセスなどの短文翻訳を行う共通関数
 */
export async function translateThoughts(options: TranslateThoughtsOptions): Promise<string> {
  const { provider, text, settings } = options

  if (!text || !text.trim()) return ''

  if (provider === 'deepl') {
    // 同一オリジンのサーバーAPI経由でCORS回避・鍵秘匿
    const res = await fetch('/api/translate/deepl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, apiKey: settings.deeplApiKey || undefined }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`DeepL proxy error: ${res.status} ${body}`)
    }
    const data = (await res.json()) as { text?: string; error?: string }
    if (data.error) throw new Error(data.error)
    return data.text || ''
  }

  // Gemini翻訳
  const model = settings.thoughtTranslationModel || 'gemini-2.0-flash-lite'
  const gemini = useGeminiApi()
  const client = gemini.createGeminiClient(settings.apiKey)

  const resp = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: 'Translate the following text into natural Japanese. Only output the translation without explanations or quotes.\n\n' + text,
          },
        ],
      },
    ],
    config: { maxOutputTokens: Math.max(64, Math.min(1024, Math.ceil(text.length * 1.5))) },
  })

  type MinimalCandidate = { content?: { parts?: Array<{ text?: string }> } }
  const candidate = resp.candidates?.[0] as MinimalCandidate | undefined
  const parts = candidate?.content?.parts
  const translated =
    parts
      ?.map((p) => p.text || '')
      .join('')
      ?.trim() || ''
  return translated
}
