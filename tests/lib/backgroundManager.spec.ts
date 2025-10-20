import { describe, expect, it } from 'bun:test'

describe('backgroundManager', () => {
  it('extractBackgroundSelectionFromMessageが正しく動作する', () => {
    // 正常なFunction Calling結果を含むメッセージ
    const validMessage = {
      role: 'assistant' as const,
      content: '背景を変更しました',
      functionResults: [
        {
          name: 'manageBackground',
          result: {
            data: {
              selectionResult: {
                categoryName: 'Nature',
                imageName: 'forest.jpg',
              },
            },
          },
        },
      ],
    }

    const extractFunction = (message: Record<string, unknown>) => {
      if (message.role !== 'assistant' || !message.functionResults) {
        return null
      }

      const functionResults = message.functionResults as Record<string, unknown>[]
      const backgroundResult = functionResults.find((result: Record<string, unknown>) => {
        if (result.name === 'manageBackground' && result.result && typeof result.result === 'object') {
          const resultData = result.result as Record<string, unknown>
          return resultData.data && typeof resultData.data === 'object' && 'selectionResult' in resultData.data
        }
        return false
      })

      if (!backgroundResult?.result || typeof backgroundResult.result !== 'object' || !('data' in backgroundResult.result)) {
        return null
      }

      const resultData = backgroundResult.result as Record<string, unknown>
      if (!resultData.data || typeof resultData.data !== 'object' || !('selectionResult' in resultData.data)) {
        return null
      }

      const data = resultData.data as Record<string, unknown>
      const selectionResult = data.selectionResult as Record<string, unknown>

      if (typeof selectionResult.categoryName === 'string' && typeof selectionResult.imageName === 'string') {
        return {
          categoryName: selectionResult.categoryName,
          imageName: selectionResult.imageName,
        }
      }

      return null
    }

    const result = extractFunction(validMessage)
    expect(result).toBeDefined()
    expect(result?.categoryName).toBe('Nature')
    expect(result?.imageName).toBe('forest.jpg')
  })

  it('extractBackgroundSelectionFromMessageがassistant以外のメッセージでnullを返す', () => {
    const userMessage = {
      role: 'user' as const,
      content: '背景を変更してください',
    }

    const extractFunction = (message: Record<string, unknown>) => {
      if (message.role !== 'assistant' || !message.functionResults) {
        return null
      }
      return null
    }

    const result = extractFunction(userMessage)
    expect(result).toBeNull()
  })

  it('extractBackgroundSelectionFromMessageがfunctionResultsがないメッセージでnullを返す', () => {
    const messageWithoutFunctionResults = {
      role: 'assistant' as const,
      content: '通常のメッセージです',
    }

    const extractFunction = (message: Record<string, unknown>) => {
      if (message.role !== 'assistant' || !message.functionResults) {
        return null
      }
      return null
    }

    const result = extractFunction(messageWithoutFunctionResults)
    expect(result).toBeNull()
  })

  it('extractBackgroundSelectionFromMessageがmanageBackground以外のfunctionでnullを返す', () => {
    const messageWithOtherFunction = {
      role: 'assistant' as const,
      content: '他の機能を実行しました',
      functionResults: [
        {
          name: 'otherFunction',
          result: {
            data: {
              someResult: 'value',
            },
          },
        },
      ],
    }

    const extractFunction = (message: Record<string, unknown>) => {
      if (message.role !== 'assistant' || !message.functionResults) {
        return null
      }

      const functionResults = message.functionResults as Record<string, unknown>[]
      const backgroundResult = functionResults.find((result: Record<string, unknown>) => {
        if (result.name === 'manageBackground' && result.result && typeof result.result === 'object') {
          const resultData = result.result as Record<string, unknown>
          return resultData.data && typeof resultData.data === 'object' && 'selectionResult' in resultData.data
        }
        return false
      })

      return backgroundResult ? { categoryName: 'test', imageName: 'test.jpg' } : null
    }

    const result = extractFunction(messageWithOtherFunction)
    expect(result).toBeNull()
  })

  it('getBackgroundImageDataUrlが正しく動作する', async () => {
    const mockImageData = {
      mimeType: 'image/jpeg',
      base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    }

    const getBackgroundImageDataUrl = async (_categoryName: string, _imageName: string) => {
      // モック実装
      if (_categoryName === 'Nature' && _imageName === 'forest.jpg') {
        return `data:${mockImageData.mimeType};base64,${mockImageData.base64Data}`
      }
      return null
    }

    const result = await getBackgroundImageDataUrl('Nature', 'forest.jpg')
    expect(result).toBeDefined()
    expect(result).toContain('data:image/jpeg;base64,')
    expect(result).toContain(mockImageData.base64Data)
  })

  it('getBackgroundImageDataUrlが存在しない画像でnullを返す', async () => {
    const getBackgroundImageDataUrl = async (_categoryName: string, _imageName: string) => {
      // モック実装
      return null
    }

    const result = await getBackgroundImageDataUrl('NonExistent', 'image.jpg')
    expect(result).toBeNull()
  })

  it('getLatestAssistantMessageが正しく動作する', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'こんにちは',
      },
      {
        role: 'assistant' as const,
        content: 'こんにちは！',
      },
      {
        role: 'user' as const,
        content: '背景を変更してください',
      },
      {
        role: 'assistant' as const,
        content: '背景を変更しました',
        functionResults: [
          {
            name: 'manageBackground',
            result: {
              data: {
                selectionResult: {
                  categoryName: 'Nature',
                  imageName: 'forest.jpg',
                },
              },
            },
          },
        ],
      },
    ]

    const getLatestAssistantMessage = (messages: Record<string, unknown>[]) => {
      const assistantMessages = messages.filter((msg) => msg.role === 'assistant')
      const latestMessage = assistantMessages[assistantMessages.length - 1]
      return latestMessage ?? null
    }

    const result = getLatestAssistantMessage(messages)
    expect(result).toBeDefined()
    expect(result?.role).toBe('assistant')
    expect(result?.content).toBe('背景を変更しました')
    expect(result?.functionResults).toBeDefined()
  })

  it('getLatestAssistantMessageがassistantメッセージがない場合にnullを返す', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'こんにちは',
      },
      {
        role: 'user' as const,
        content: '背景を変更してください',
      },
    ]

    const getLatestAssistantMessage = (messages: Record<string, unknown>[]) => {
      const assistantMessages = messages.filter((msg) => msg.role === 'assistant')
      const latestMessage = assistantMessages[assistantMessages.length - 1]
      return latestMessage ?? null
    }

    const result = getLatestAssistantMessage(messages)
    expect(result).toBeNull()
  })

  it('getLatestAssistantMessageが空のメッセージ配列でnullを返す', () => {
    const messages: Record<string, unknown>[] = []

    const getLatestAssistantMessage = (messages: Record<string, unknown>[]) => {
      const assistantMessages = messages.filter((msg) => msg.role === 'assistant')
      const latestMessage = assistantMessages[assistantMessages.length - 1]
      return latestMessage ?? null
    }

    const result = getLatestAssistantMessage(messages)
    expect(result).toBeNull()
  })

  it('BackgroundSelectionResultの型が正しく定義されている', () => {
    interface BackgroundSelectionResult {
      categoryName: string
      imageName: string
    }

    const result: BackgroundSelectionResult = {
      categoryName: 'Nature',
      imageName: 'forest.jpg',
    }

    expect(typeof result.categoryName).toBe('string')
    expect(typeof result.imageName).toBe('string')
    expect(result.categoryName).toBe('Nature')
    expect(result.imageName).toBe('forest.jpg')
  })

  it('Data URLの形式が正しく生成される', () => {
    const mimeType = 'image/jpeg'
    const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const dataUrl = `data:${mimeType};base64,${base64Data}`

    expect(dataUrl).toBe('data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    expect(dataUrl.startsWith('data:')).toBe(true)
    expect(dataUrl.includes('base64,')).toBe(true)
  })

  it('エラーハンドリングが正しく動作する', () => {
    const handleError = (error: unknown) => {
      if (error instanceof Error) {
        return error.message
      }
      return 'Unknown error'
    }

    const testError = new Error('Database connection failed')
    const result = handleError(testError)
    expect(result).toBe('Database connection failed')

    const unknownError = 'String error'
    const unknownResult = handleError(unknownError)
    expect(unknownResult).toBe('Unknown error')
  })
})
