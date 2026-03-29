import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Type } from '@google/genai'

// --- モック設定 ---

const mockFetch = mock(() => Promise.resolve(new Response()))

mock.module('openai', () => ({
  OpenAI: mock(() => ({
    apiKey: 'ollama',
    chat: {
      completions: {
        create: mock(),
      },
    },
  })),
}))

mock.module('~/composables/useFunctionCalling', () => ({
  useFunctionCalling: () => ({
    getEnabledFunctionDeclarations: mock(() => [
      {
        name: 'test_function',
        description: 'Test function',
        parameters: {
          type: 'OBJECT',
          properties: {
            param1: { type: 'STRING' },
          },
          required: ['param1'],
        },
      },
    ]),
    executeFunction: mock(() =>
      Promise.resolve({
        result: 'test result',
        context: { persistentMemory: {} },
      })
    ),
  }),
}))

mock.module('~/lib/ids', () => ({
  generateMessageId: mock(() => 'test-message-id'),
}))

mock.module('~/stores/chat', () => ({
  useChatStore: () => ({
    currentSession: {
      persistentMemory: {},
    },
  }),
}))

mock.module('~/lib/logger', () => ({
  logger: {
    info: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let useOllamaApi: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _testing: any

describe('useOllamaApi', () => {
  beforeEach(async () => {
    const mod = await import('~/composables/useOllamaApi')
    useOllamaApi = mod.useOllamaApi
    _testing = mod._testing
  })

  const getComposable = () => useOllamaApi()

  // =========================================================================
  // 初期化
  // =========================================================================
  describe('初期化', () => {
    it('コンポーザブルが正しく初期化される', () => {
      const composable = getComposable()

      expect(composable).toBeDefined()
      expect(typeof composable.createOllamaClient).toBe('function')
      expect(typeof composable.generateContent).toBe('function')
      expect(typeof composable.generateContentStream).toBe('function')
      expect(typeof composable.getAvailableModels).toBe('function')
    })
  })

  // =========================================================================
  // convertGeminiSchemaToOpenAi (直接テスト)
  // =========================================================================
  describe('convertGeminiSchemaToOpenAi', () => {
    beforeEach(() => {
      // テスト前にキャッシュをクリア
      _testing.schemaConversionCache.clear()
    })

    it('STRING型のスキーマを変換する', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.STRING,
        description: 'A string field',
      })

      expect(result).toEqual({
        type: 'string',
        description: 'A string field',
      })
    })

    it('NUMBER型のスキーマを変換する', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.NUMBER,
      })

      expect(result).toEqual({ type: 'number' })
    })

    it('BOOLEAN型のスキーマを変換する', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.BOOLEAN,
      })

      expect(result).toEqual({ type: 'boolean' })
    })

    it('INTEGER型のスキーマを変換する', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.INTEGER,
      })

      expect(result).toEqual({ type: 'integer' })
    })

    it('ARRAY型のスキーマを変換する（items含む）', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
      })

      expect(result).toEqual({
        type: 'array',
        items: { type: 'string' },
      })
    })

    it('OBJECT型のスキーマを変換する（properties, required含む）', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          age: { type: Type.NUMBER },
        },
        required: ['name'],
      })

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      })
    })

    it('ネストしたスキーマを変換する', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                label: { type: Type.STRING },
              },
            },
          },
        },
      })

      expect(result).toEqual({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                label: { type: 'string' },
              },
            },
          },
        },
      })
    })

    it('enum付きスキーマを変換する', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.STRING,
        enum: ['red', 'green', 'blue'],
      })

      expect(result).toEqual({
        type: 'string',
        enum: ['red', 'green', 'blue'],
      })
    })

    it('description付きスキーマを変換する', () => {
      const result = _testing.convertGeminiSchemaToOpenAi({
        type: Type.OBJECT,
        description: 'A complex object',
        properties: {
          field: {
            type: Type.STRING,
            description: 'A field description',
          },
        },
      })

      expect(result.description).toBe('A complex object')
      expect(result.properties.field.description).toBe('A field description')
    })

    it('キャッシュが効いている（同じスキーマで2回呼ぶと同じ参照を返す）', () => {
      const schema = {
        type: Type.OBJECT,
        properties: {
          cached: { type: Type.STRING },
        },
      }

      const result1 = _testing.convertGeminiSchemaToOpenAi(schema)
      const result2 = _testing.convertGeminiSchemaToOpenAi(schema)

      // キャッシュにより同一参照が返される
      expect(result1).toBe(result2)
      // キャッシュには親スキーマ＋子スキーマ(properties内)もキャッシュされうる
      const sizeAfterFirst = _testing.schemaConversionCache.size

      // 同じスキーマを再度変換してもサイズは増えない
      _testing.convertGeminiSchemaToOpenAi(schema)
      expect(_testing.schemaConversionCache.size).toBe(sizeAfterFirst)
    })

    it('キャッシュサイズ制限（MAX_CACHE_SIZE=100を超えた場合に古いエントリが削除される）', () => {
      // MAX_CACHE_SIZE は 100
      expect(_testing.MAX_CACHE_SIZE).toBe(100)

      // 100個のユニークなスキーマを変換してキャッシュを埋める
      for (let i = 0; i < 100; i++) {
        _testing.convertGeminiSchemaToOpenAi({
          type: Type.STRING,
          description: `field_${i}`,
        })
      }

      expect(_testing.schemaConversionCache.size).toBe(100)

      // 最初のエントリのキーを記録
      const firstKey = _testing.schemaConversionCache.keys().next().value

      // 101番目を追加すると最初のエントリが削除される
      _testing.convertGeminiSchemaToOpenAi({
        type: Type.STRING,
        description: 'field_100',
      })

      // サイズは100のまま（古いものが削除されて新しいものが追加）
      expect(_testing.schemaConversionCache.size).toBe(100)
      // 最初のキーは削除されている
      expect(_testing.schemaConversionCache.has(firstKey)).toBe(false)
    })

    it('null/undefinedスキーマはそのまま返す', () => {
      expect(_testing.convertGeminiSchemaToOpenAi(null)).toBeNull()
      expect(_testing.convertGeminiSchemaToOpenAi(undefined)).toBeUndefined()
    })

    it('プリミティブ値はそのまま返す', () => {
      expect(_testing.convertGeminiSchemaToOpenAi('string_value')).toBe('string_value')
      expect(_testing.convertGeminiSchemaToOpenAi(42)).toBe(42)
    })
  })

  // =========================================================================
  // convertGeminiTypeToOpenAiType (直接テスト)
  // =========================================================================
  describe('convertGeminiTypeToOpenAiType', () => {
    it('OBJECT -> object', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('OBJECT')).toBe('object')
    })

    it('STRING -> string', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('STRING')).toBe('string')
    })

    it('NUMBER -> number', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('NUMBER')).toBe('number')
    })

    it('INTEGER -> number', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('INTEGER')).toBe('number')
    })

    it('BOOLEAN -> boolean', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('BOOLEAN')).toBe('boolean')
    })

    it('ARRAY -> array', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('ARRAY')).toBe('array')
    })

    it('小文字入力もサポートする', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('string')).toBe('string')
      expect(_testing.convertGeminiTypeToOpenAiType('object')).toBe('object')
    })

    it('未知の文字列型はlowercaseで返す', () => {
      expect(_testing.convertGeminiTypeToOpenAiType('CUSTOM_TYPE')).toBe('custom_type')
    })

    it('非文字列はstringをデフォルトで返す', () => {
      expect(_testing.convertGeminiTypeToOpenAiType(123)).toBe('string')
      expect(_testing.convertGeminiTypeToOpenAiType(null)).toBe('string')
      expect(_testing.convertGeminiTypeToOpenAiType(undefined)).toBe('string')
    })
  })

  // =========================================================================
  // getAvailableModels
  // =========================================================================
  describe('getAvailableModels', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.fetch = mockFetch as any
      mockFetch.mockReset()
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    it('正常応答: モデル名の配列を返す', async () => {
      const composable = getComposable()

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [{ name: 'llama3:latest' }, { name: 'mistral:latest' }, { name: 'codellama:7b' }],
          }),
          { status: 200 }
        )
      )

      const models = await composable.getAvailableModels('http://localhost:11434')

      expect(models).toEqual(['llama3:latest', 'mistral:latest', 'codellama:7b'])
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags')
    })

    it('空のモデルリスト: 空配列を返す', async () => {
      const composable = getComposable()

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [],
          }),
          { status: 200 }
        )
      )

      const models = await composable.getAvailableModels('http://localhost:11434')

      expect(models).toEqual([])
    })

    it('modelsフィールドがない場合: 空配列を返す', async () => {
      const composable = getComposable()

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

      const models = await composable.getAvailableModels('http://localhost:11434')

      expect(models).toEqual([])
    })

    it('ネットワークエラー: エラーをthrow', async () => {
      const composable = getComposable()

      mockFetch.mockRejectedValueOnce(new Error('Network error: connection refused'))

      await expect(composable.getAvailableModels('http://localhost:11434')).rejects.toThrow('Network error: connection refused')
    })

    it('不正なURL: バリデーションエラーをthrow', async () => {
      const composable = getComposable()

      await expect(composable.getAvailableModels('ftp://invalid-url')).rejects.toThrow('無効なURLです')
    })

    it('空のURL: バリデーションエラーをthrow', async () => {
      const composable = getComposable()

      await expect(composable.getAvailableModels('')).rejects.toThrow()
    })

    it('HTTPエラー（404）: エラーをthrow', async () => {
      const composable = getComposable()

      mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

      await expect(composable.getAvailableModels('http://localhost:11434')).rejects.toThrow('Ollama API error: 404')
    })

    it('HTTPエラー（500）: エラーをthrow', async () => {
      const composable = getComposable()

      mockFetch.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))

      await expect(composable.getAvailableModels('http://localhost:11434')).rejects.toThrow('Ollama API error: 500')
    })
  })
})
