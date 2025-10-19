import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { summarizeChatHistory, type SummaryOptions } from '~/lib/summary'

// モックの定義
const mockGeminiClient = {
  models: {
    generateContent: mock(() => Promise.resolve({})),
  },
}

const mockUseGeminiApi = mock(() => ({
  createGeminiClient: mock(() => mockGeminiClient),
}))

// モックの設定
mock.module('~/composables/useGeminiApi', () => ({
  useGeminiApi: mockUseGeminiApi,
}))

mock.module('~/utils/logger', () => ({
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  },
}))

describe('useSummary', () => {
  beforeEach(() => {
    // モックの呼び出し回数をリセット
    mockGeminiClient.models.generateContent.mockClear()
  })

  describe('summarizeChatHistory', () => {
    const defaultOptions: SummaryOptions = {
      apiKey: 'test-api-key',
      model: 'gemini-2.5-flash',
    }

    const sampleMessages = [
      { role: 'user', content: 'こんにちは' },
      { role: 'assistant', content: 'こんにちは！何かお手伝いできることはありますか？' },
      { role: 'user', content: '今日の天気を教えて' },
      { role: 'assistant', content: '申し訳ございませんが、リアルタイムの天気情報は取得できません。' },
    ]

    it('正常に要約を生成できる', async () => {
      const expectedSummary = 'ユーザーが挨拶し、天気について質問したが、アシスタントはリアルタイムの天気情報を提供できないと回答した。'

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: expectedSummary }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      const result = await summarizeChatHistory(sampleMessages, defaultOptions)

      expect(result).toBe(expectedSummary)
      expect(mockGeminiClient.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: '以下の会話履歴を要約してください:\n\nユーザー: こんにちは\n\nアシスタント: こんにちは！何かお手伝いできることはありますか？\n\nユーザー: 今日の天気を教えて\n\nアシスタント: 申し訳ございませんが、リアルタイムの天気情報は取得できません。',
              },
            ],
          },
        ],
        config: {
          systemInstruction: {
            role: 'user',
            parts: [
              {
                text: 'あなたは優秀な要約者です。与えられた会話履歴を簡潔で分かりやすい要約にまとめてください。重要なポイントや決定事項、次のアクションなどを明確に示してください。要約のみを出力し、余計な説明は不要です。',
              },
            ],
          },
          thinkingConfig: { includeThoughts: false },
        },
      })
    })

    it('カスタムシステム指示で要約を生成できる', async () => {
      const customSystemInstruction = '会話の要点を3つのポイントでまとめてください。'
      const expectedSummary = '1. 挨拶の交換\n2. 天気情報の要求\n3. 情報提供の制限についての説明'

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: expectedSummary }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      const options: SummaryOptions = {
        ...defaultOptions,
        systemInstruction: customSystemInstruction,
      }

      const result = await summarizeChatHistory(sampleMessages, options)

      expect(result).toBe(expectedSummary)
      expect(mockGeminiClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: {
              role: 'user',
              parts: [{ text: customSystemInstruction }],
            },
          }),
        })
      )
    })

    it('空のメッセージ配列の場合は空文字を返す', async () => {
      const result = await summarizeChatHistory([], defaultOptions)

      expect(result).toBe('')
      expect(mockGeminiClient.models.generateContent).not.toHaveBeenCalled()
    })

    it('nullまたはundefinedのメッセージの場合は空文字を返す', async () => {
      const result1 = await summarizeChatHistory(null as unknown as Array<{ role: string; content: string }>, defaultOptions)
      const result2 = await summarizeChatHistory(undefined as unknown as Array<{ role: string; content: string }>, defaultOptions)

      expect(result1).toBe('')
      expect(result2).toBe('')
      expect(mockGeminiClient.models.generateContent).not.toHaveBeenCalled()
    })

    it('MAX_TOKENSエラーの場合は空文字を返す', async () => {
      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: '不完全な要約...' }],
            },
            finishReason: 'MAX_TOKENS',
          },
        ],
      })

      const result = await summarizeChatHistory(sampleMessages, defaultOptions)

      expect(result).toBe('')
    })

    it('partsが空の場合は空文字を返す', async () => {
      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [],
            },
            finishReason: 'STOP',
          },
        ],
      })

      const result = await summarizeChatHistory(sampleMessages, defaultOptions)

      expect(result).toBe('')
    })

    it('candidatesが空の場合は空文字を返す', async () => {
      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [],
      })

      const result = await summarizeChatHistory(sampleMessages, defaultOptions)

      expect(result).toBe('')
    })

    it('複数のpartsがある場合は結合される', async () => {
      const part1 = '最初の部分'
      const part2 = '2番目の部分'
      const expectedSummary = part1 + part2

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: part1 }, { text: part2 }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      const result = await summarizeChatHistory(sampleMessages, defaultOptions)

      expect(result).toBe(expectedSummary)
    })

    it('textがundefinedのpartsは無視される', async () => {
      const validText = '有効なテキスト'

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: validText }, { text: undefined }, { text: '' }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      const result = await summarizeChatHistory(sampleMessages, defaultOptions)

      expect(result).toBe(validText)
    })

    it('空のシステム指示の場合はデフォルト指示を使用する', async () => {
      const options: SummaryOptions = {
        ...defaultOptions,
        systemInstruction: '',
      }

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: '要約結果' }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      await summarizeChatHistory(sampleMessages, options)

      expect(mockGeminiClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: {
              role: 'user',
              parts: [
                {
                  text: 'あなたは優秀な要約者です。与えられた会話履歴を簡潔で分かりやすい要約にまとめてください。重要なポイントや決定事項、次のアクションなどを明確に示してください。要約のみを出力し、余計な説明は不要です。',
                },
              ],
            },
          }),
        })
      )
    })

    it('空白のみのシステム指示の場合はデフォルト指示を使用する', async () => {
      const options: SummaryOptions = {
        ...defaultOptions,
        systemInstruction: '   \n\t  ',
      }

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: '要約結果' }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      await summarizeChatHistory(sampleMessages, options)

      expect(mockGeminiClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: {
              role: 'user',
              parts: [
                {
                  text: 'あなたは優秀な要約者です。与えられた会話履歴を簡潔で分かりやすい要約にまとめてください。重要なポイントや決定事項、次のアクションなどを明確に示してください。要約のみを出力し、余計な説明は不要です。',
                },
              ],
            },
          }),
        })
      )
    })

    it('API呼び出しでエラーが発生した場合はエラーを投げる', async () => {
      const errorMessage = 'API呼び出しエラー'
      mockGeminiClient.models.generateContent.mockRejectedValue(new Error(errorMessage))

      await expect(summarizeChatHistory(sampleMessages, defaultOptions)).rejects.toThrow(errorMessage)
    })

    it('単一メッセージでも正常に動作する', async () => {
      const singleMessage = [{ role: 'user', content: 'テストメッセージ' }]
      const expectedSummary = 'ユーザーがテストメッセージを送信した。'

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: expectedSummary }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      const result = await summarizeChatHistory(singleMessage, defaultOptions)

      expect(result).toBe(expectedSummary)
      expect(mockGeminiClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: '以下の会話履歴を要約してください:\n\nユーザー: テストメッセージ',
                },
              ],
            },
          ],
        })
      )
    })

    it('長いメッセージでも正常に動作する', async () => {
      const longMessage = 'これは非常に長いメッセージです。'.repeat(100)
      const longMessages = [
        { role: 'user', content: longMessage },
        { role: 'assistant', content: '長いメッセージを受け取りました。' },
      ]
      const expectedSummary = 'ユーザーが長いメッセージを送信し、アシスタントが応答した。'

      mockGeminiClient.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: expectedSummary }],
            },
            finishReason: 'STOP',
          },
        ],
      })

      const result = await summarizeChatHistory(longMessages, defaultOptions)

      expect(result).toBe(expectedSummary)
      expect(mockGeminiClient.models.generateContent).toHaveBeenCalled()
    })
  })
})
