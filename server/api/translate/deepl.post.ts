import { defineEventHandler, readBody, setResponseStatus } from 'h3'

interface RequestBody {
  text?: string
  apiKey?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as RequestBody
    const text = (body?.text || '').toString()
    if (!text.trim()) {
      setResponseStatus(event, 400)
      return { error: 'Text is required' }
    }

    const apiKey = body?.apiKey
    if (!apiKey) {
      setResponseStatus(event, 400)
      return { error: 'DeepL API key is required' }
    }

    const endpoint = 'https://api-free.deepl.com/v2/translate'
    const params = new URLSearchParams()
    params.set('auth_key', apiKey)
    params.set('text', text)
    params.set('target_lang', 'JA')

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (!res.ok) {
      const bodyText = await res.text()
      setResponseStatus(event, 502)
      return { error: `DeepL API error: ${res.status} ${bodyText}` }
    }
    const data = (await res.json()) as { translations?: Array<{ text?: string }> }
    const translated = data.translations?.map((t) => t.text || '').join('\n') || ''
    return { text: translated }
  } catch (e) {
    setResponseStatus(event, 500)
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
})
