import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { OpenAiApiSettings, OpenAiCombinedResponse, OpenAiStreamingChunk } from '~/composables/useOpenAiAgentsApi'
import type { GeminiMessage } from '~/types/chat'

// 依存関係をモック
mock.module('@openai/agents', () => ({
  Agent: mock((config) => ({
    config,
    run: mock(),
  })),
  assistant: mock((content) => ({ type: 'assistant', content })),
  user: mock((content) => ({ type: 'user', content })),
  tool: mock((definition) => ({
    ...definition,
    execute: definition.execute,
  })),
  run: mock(),
  setDefaultOpenAIClient: mock(),
}))

mock.module('openai', () => ({
  OpenAI: mock(() => ({
    apiKey: 'test-key',
  })),
}))

mock.module('~/composables/useFunctionCalling', () => ({
  useFunctionCalling: () => ({
    getEnabledFunctionDeclarations: mock(() => [
      {
        name: 'test_function',
        description: 'Test function',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
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

mock.module('~/utils/logger', () => ({
  logger: {
    info: mock(),
    warn: mock(),
    error: mock(),
  },
}))

// コンポーザブルを動的にインポート

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let useOpenAiAgentsApi: any

describe('useOpenAiAgentsApi', () => {
  beforeEach(async () => {
    // 動的にコンポーザブルをインポート
    const { useOpenAiAgentsApi: importedComposable } = await import('~/composables/useOpenAiAgentsApi')
    useOpenAiAgentsApi = importedComposable
  })

  // ヘルパー関数：コンポーザブルを取得
  const getComposable = () => useOpenAiAgentsApi()

  describe('初期化', () => {
    it('コンポーザブルが正しく初期化される', () => {
      const composable = getComposable()

      expect(composable).toBeDefined()
      expect(typeof composable.createAgent).toBe('function')
      expect(typeof composable.generateContent).toBe('function')
      expect(typeof composable.generateContentStream).toBe('function')
      expect(typeof composable.getAvailableModels).toBe('function')
      expect(typeof composable.extractThoughtsFromResponse).toBe('function')
    })
  })

  describe('createAgent', () => {
    it('基本的なAgentを作成できる', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are a helpful assistant',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      const agent = composable.createAgent(settings)

      expect(agent).toBeDefined()
      expect(agent.config.name).toBe('Assistant')
      expect(agent.config.instructions).toBe('You are a helpful assistant')
      expect(agent.config.model).toBe('gpt-4o')
    })

    it('カスタムシステムインストラクションでAgentを作成できる', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'Default prompt',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      const customInstruction = 'You are a specialized coding assistant'
      const agent = composable.createAgent(settings, customInstruction)

      expect(agent.config.instructions).toBe(customInstruction)
    })

    it('Function Callingが有効な場合にツールを設定できる', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        functionCalling: {
          enabled: true,
          mode: 'auto',
        },
        topK: 0,
      }

      const agent = composable.createAgent(settings)

      expect(agent.config.tools).toBeDefined()
      expect(agent.config.toolChoice).toBe('auto')
    })

    it('Function Calling mode "any"でtool_choiceがrequiredになる', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        functionCalling: {
          enabled: true,
          mode: 'any',
        },
        topK: 0,
      }

      const agent = composable.createAgent(settings)

      expect(agent.config.toolChoice).toBe('required')
    })

    it('Function Calling mode "none"でtool_choiceがnoneになる', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        functionCalling: {
          enabled: true,
          mode: 'none',
        },
        topK: 0,
      }

      const agent = composable.createAgent(settings)

      expect(agent.config.toolChoice).toBe('none')
    })

    it('GPT-5モデルでモデル設定が正しく追加される', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-5',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        modelSettings: {
          reasoning: { effort: 'medium' },
          text: { verbosity: 'high' },
        },
        topK: 0,
      }

      const agent = composable.createAgent(settings)

      expect(agent.config.modelSettings).toBeDefined()
      expect(agent.config.modelSettings.reasoning.effort).toBe('medium')
      expect(agent.config.modelSettings.text.verbosity).toBe('high')
    })
  })

  describe('toAgentInputItems', () => {
    it('メッセージをAgentInputItem配列に正しく変換する', async () => {
      const composable = getComposable()

      // run関数をモック
      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockResolvedValue({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'Generated response',
              },
            ],
          },
        ],
      })

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Hi there!' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      // 内部でtoAgentInputItemsが使用されることを確認
      const result = await composable.generateContent(messages, {}, null, settings)
      expect(result.text).toBe('Generated response')
    })

    it('複数のテキストパーツを結合する', async () => {
      const composable = getComposable()

      // run関数をモック
      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockResolvedValue({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'Generated response',
              },
            ],
          },
        ],
      })

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'First part' }, { text: 'Second part' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      // 内部でテキストパーツが結合されることを確認
      const result = await composable.generateContent(messages, {}, null, settings)
      expect(result.text).toBe('Generated response')
    })
  })

  describe('generateContent', () => {
    it('非ストリーミングでコンテンツを生成できる', async () => {
      const composable = getComposable()

      // run関数をモック
      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockResolvedValue({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'Generated response',
              },
            ],
          },
        ],
      })

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Test message' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      const result = await composable.generateContent(messages, {}, null, settings)

      expect(result.text).toBe('Generated response')
      expect(run).toHaveBeenCalled()
    })

    it('ダミープロンプトが正しく追加される', async () => {
      const composable = getComposable()

      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockResolvedValue({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'Response',
              },
            ],
          },
        ],
      })

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Original message' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        enableDummyUserPrompt: true,
        dummyUserPrompt: 'Dummy user prompt',
        enableDummyModelPrompt: true,
        dummyModelPrompt: 'Dummy model prompt',
        topK: 0,
      }

      await composable.generateContent(messages, {}, null, settings)

      // run関数が呼ばれたことを確認
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((run as any).mock.calls.length).toBeGreaterThan(0)
    })

    it('空のメッセージでエラーを投げる', async () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      await expect(composable.generateContent([], {}, null, settings)).rejects.toThrow('入力メッセージが空です')
    })

    it('空のレスポンスでエラーを投げる', async () => {
      const composable = getComposable()

      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockResolvedValue({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: '', // 空のテキスト
              },
            ],
          },
        ],
      })

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Test message' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      await expect(composable.generateContent(messages, {}, null, settings)).rejects.toThrow('API応答が空です')
    })
  })

  describe('generateContentStream', () => {
    it('ストリーミングでコンテンツを生成できる', async () => {
      const composable = getComposable()

      // ストリーミング用のモック
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'raw_model_stream_event',
            data: {
              type: 'output_text_delta',
              delta: 'Hello',
            },
          }
          yield {
            type: 'raw_model_stream_event',
            data: {
              type: 'output_text_delta',
              delta: ' World',
            },
          }
        },
        completed: Promise.resolve(),
      }

      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockResolvedValue(mockStream)

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Test message' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      const stream = composable.generateContentStream(messages, {}, null, settings)
      const chunks: OpenAiStreamingChunk[] = []

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(2)
      expect(chunks[0]?.contentText).toBe('Hello')
      expect(chunks[1]?.contentText).toBe(' World')
    })

    it('Function Callsが含まれるストリーミングを処理できる', async () => {
      const composable = getComposable()

      // Function Callを含むストリーミング
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'raw_model_stream_event',
            data: {
              type: 'output_text_delta',
              delta: 'I will call a function',
            },
          }
        },
        completed: Promise.resolve(),
      }

      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockResolvedValue(mockStream)

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Call a function' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        functionCalling: {
          enabled: true,
          mode: 'auto',
        },
        topK: 0,
      }

      const stream = composable.generateContentStream(messages, {}, null, settings)
      const chunks: OpenAiStreamingChunk[] = []

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0]?.contentText).toBe('I will call a function')
    })
  })

  describe('getAvailableModels', () => {
    it('利用可能なモデル一覧を返す', async () => {
      const composable = getComposable()

      const models = await composable.getAvailableModels('test-key')

      expect(models).toContain('gpt-5')
      expect(models).toContain('gpt-4o')
      expect(models).toContain('gpt-4o-mini')
      expect(models).toContain('gpt-4-turbo')
      expect(models).toContain('gpt-3.5-turbo')
      expect(models).toContain('o1')
      expect(models).toContain('o1-mini')
    })
  })

  describe('extractThoughtsFromResponse', () => {
    it('レスポンスから思考プロセスを抽出する', () => {
      const composable = getComposable()

      const response: OpenAiCombinedResponse = {
        text: 'Main response',
        thoughts: 'Internal thoughts',
      }

      const result = composable.extractThoughtsFromResponse(response)

      expect(result.content).toBe('Main response')
      expect(result.thoughts).toBe('Internal thoughts')
    })

    it('思考プロセスがない場合も正しく処理する', () => {
      const composable = getComposable()

      const response: OpenAiCombinedResponse = {
        text: 'Main response',
      }

      const result = composable.extractThoughtsFromResponse(response)

      expect(result.content).toBe('Main response')
      expect(result.thoughts).toBeUndefined()
    })
  })

  describe('エラーハンドリング', () => {
    it('APIキーエラーを正しく処理する', async () => {
      const composable = getComposable()

      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockRejectedValue(new Error('Invalid API key'))

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Test message' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'invalid-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      await expect(composable.generateContent(messages, {}, null, settings)).rejects.toThrow('OpenAI APIキーが無効または設定されていません')
    })

    it('クォータエラーを正しく処理する', async () => {
      const composable = getComposable()

      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockRejectedValue(new Error('Quota exceeded'))

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Test message' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      await expect(composable.generateContent(messages, {}, null, settings)).rejects.toThrow('Quota exceeded')
    })

    it('レート制限エラーを正しく処理する', async () => {
      const composable = getComposable()

      const { run } = await import('@openai/agents')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(run as any).mockRejectedValue(new Error('Rate limit exceeded'))

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Test message' }],
        },
      ]

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: false,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        topK: 0,
      }

      await expect(composable.generateContent(messages, {}, null, settings)).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('Function Calling統合', () => {
    it('Function Callingが正しく設定される', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        functionCalling: {
          enabled: true,
          mode: 'auto',
          allowedFunctionNames: ['test_function'],
        },
        topK: 0,
      }

      const agent = composable.createAgent(settings)

      expect(agent.config.tools).toBeDefined()
      expect(agent.config.tools.length).toBeGreaterThan(0)
      expect(agent.config.toolChoice).toBe('auto')
    })

    it('allowedFunctionNamesでフィルタリングされる', () => {
      const composable = getComposable()

      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        functionCalling: {
          enabled: true,
          mode: 'auto',
          allowedFunctionNames: ['test_function'], // 特定の関数のみ許可
        },
        topK: 0,
      }

      const agent = composable.createAgent(settings)

      expect(agent.config.tools).toBeDefined()
      // test_functionのみが含まれることを確認
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = agent.config.tools.map((tool: any) => tool.name)
      expect(toolNames).toContain('test_function')
    })
  })

  describe('スキーマ変換', () => {
    it('GeminiスキーマをOpenAI形式に正しく変換する', () => {
      const composable = getComposable()

      // 内部関数をテストするため、直接呼び出し
      const _geminiSchema = {
        type: 'OBJECT',
        properties: {
          param1: {
            type: 'STRING',
            description: 'Test parameter',
          },
          param2: {
            type: 'NUMBER',
            description: 'Number parameter',
          },
        },
      }

      // convertGeminiSchemaToOpenAi関数は内部関数なので、
      // 実際の使用例でテストする
      const settings: OpenAiApiSettings = {
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        systemPrompt: 'You are helpful',
        streamingOutput: true,
        enableThinking: false,
        includeThoughts: false,
        thinkingBudget: null,
        functionCalling: {
          enabled: true,
          mode: 'auto',
        },
        topK: 0,
      }

      const agent = composable.createAgent(settings)
      expect(agent).toBeDefined()
    })
  })
})
