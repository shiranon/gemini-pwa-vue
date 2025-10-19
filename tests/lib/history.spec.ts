import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { buildChatExportData, buildChatsExportData, parseImportData, parseImportDataWithDuplicateCheck, validateImportData } from '../../app/lib/history'
import type { ChatSession, Message, PersistentMemory } from '../../app/types/chat'

// モックデータの準備
const mockMessage: Message = {
  id: 'msg-1',
  role: 'user',
  content: 'Hello, world!',
  createdAt: Date.now(),
}

const mockPersistentMemory: PersistentMemory = {
  characters: [],
  flags: [],
  gameDate: '',
  scenes: [],
  relationships: [],
}

const mockChatSession: ChatSession = {
  id: 'chat-1',
  title: 'Test Chat',
  systemPrompt: 'You are a helpful assistant.',
  messages: [mockMessage],
  persistentMemory: mockPersistentMemory,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
}

const mockChatSessions: ChatSession[] = [
  mockChatSession,
  {
    ...mockChatSession,
    id: 'chat-2',
    title: 'Another Chat',
    createdAt: Date.now() - 1000,
  },
]

// crypto.randomUUIDのモック
const mockUUID = mock()
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockUUID,
  },
})

describe('history.ts', () => {
  beforeEach(() => {
    mock.clearAllMocks()
    mockUUID.mockReturnValue('mocked-uuid')
  })

  describe('buildChatExportData', () => {
    it('チャットセッションを正しくエクスポートデータに変換する', () => {
      const result = buildChatExportData(mockChatSession)

      expect(result).toEqual({
        title: mockChatSession.title,
        messages: mockChatSession.messages,
        createdAt: mockChatSession.createdAt,
        updatedAt: mockChatSession.updatedAt,
        isArchived: false,
      })
    })

    it('isArchivedがundefinedの場合はfalseを設定する', () => {
      const chatWithoutArchived = { ...mockChatSession, isArchived: undefined }
      const result = buildChatExportData(chatWithoutArchived)

      expect(result.isArchived).toBe(false)
    })

    it('isArchivedがtrueの場合はtrueを保持する', () => {
      const archivedChat = { ...mockChatSession, isArchived: true }
      const result = buildChatExportData(archivedChat)

      expect(result.isArchived).toBe(true)
    })
  })

  describe('buildChatsExportData', () => {
    it('複数のチャットセッションを正しくエクスポートデータに変換する', () => {
      const result = buildChatsExportData(mockChatSessions)

      expect(result).toEqual({
        exportedAt: expect.any(Number),
        totalChats: 2,
        chats: [buildChatExportData(mockChatSessions[0]!), buildChatExportData(mockChatSessions[1]!)],
      })
    })

    it('空の配列でも正しく動作する', () => {
      const result = buildChatsExportData([])

      expect(result).toEqual({
        exportedAt: expect.any(Number),
        totalChats: 0,
        chats: [],
      })
    })

    it('exportedAtは現在時刻を設定する', () => {
      const before = Date.now()
      const result = buildChatsExportData(mockChatSessions)
      const after = Date.now()

      expect(result.exportedAt).toBeGreaterThanOrEqual(before)
      expect(result.exportedAt).toBeLessThanOrEqual(after)
    })
  })

  describe('validateImportData', () => {
    it('有効な単一チャットデータを認識する', () => {
      const validSingleData = {
        title: 'Test Chat',
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = validateImportData(validSingleData)

      expect(result).toEqual({
        isValid: true,
        type: 'single',
      })
    })

    it('有効なバッチチャットデータを認識する', () => {
      const validBatchData = {
        exportedAt: Date.now(),
        totalChats: 1,
        chats: [
          {
            title: 'Test Chat',
            messages: [mockMessage],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

      const result = validateImportData(validBatchData)

      expect(result).toEqual({
        isValid: true,
        type: 'batch',
      })
    })

    it('無効なデータを拒否する', () => {
      const invalidData = { invalid: 'data' }

      const result = validateImportData(invalidData)

      expect(result).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })
    })

    it('nullやundefinedを拒否する', () => {
      expect(validateImportData(null)).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })

      expect(validateImportData(undefined)).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })
    })

    it('文字列を拒否する', () => {
      const result = validateImportData('invalid string')

      expect(result).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })
    })

    it('配列を拒否する', () => {
      const result = validateImportData([1, 2, 3])

      expect(result).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })
    })

    it('必須フィールドが欠けている単一チャットデータを拒否する', () => {
      const incompleteData = {
        title: 'Test Chat',
        // messages, createdAt, updatedAtが欠けている
      }

      const result = validateImportData(incompleteData)

      expect(result).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })
    })

    it('chatsフィールドが配列でないバッチデータを拒否する', () => {
      const invalidBatchData = {
        exportedAt: Date.now(),
        totalChats: 1,
        chats: 'not an array',
      }

      const result = validateImportData(invalidBatchData)

      expect(result).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })
    })

    it('chats配列に無効なデータが含まれるバッチデータを拒否する', () => {
      const invalidBatchData = {
        exportedAt: Date.now(),
        totalChats: 1,
        chats: [
          {
            title: 'Valid Chat',
            messages: [mockMessage],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            title: 'Invalid Chat',
            // 必須フィールドが欠けている
          },
        ],
      }

      const result = validateImportData(invalidBatchData)

      expect(result).toEqual({
        isValid: false,
        error: '認識できないファイル形式です',
      })
    })
  })

  describe('parseImportData', () => {
    it('有効な単一チャットデータをChatSessionに変換する', () => {
      const singleData = {
        title: 'Test Chat',
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        systemPrompt: 'Custom system prompt',
        persistentMemory: mockPersistentMemory,
        isArchived: true,
      }

      const result = parseImportData(singleData)

      expect(result).toHaveLength(1)
      expect(result[0]!).toEqual({
        id: 'mocked-uuid',
        title: singleData.title,
        systemPrompt: singleData.systemPrompt,
        messages: [
          {
            ...mockMessage,
            id: 'mocked-uuid',
          },
        ],
        persistentMemory: singleData.persistentMemory,
        createdAt: singleData.createdAt,
        updatedAt: singleData.updatedAt,
        isArchived: true,
      })
    })

    it('有効なバッチチャットデータをChatSession配列に変換する', () => {
      const batchData = {
        exportedAt: Date.now(),
        totalChats: 2,
        chats: [
          {
            title: 'Chat 1',
            messages: [mockMessage],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            title: 'Chat 2',
            messages: [mockMessage],
            createdAt: Date.now() - 1000,
            updatedAt: Date.now() - 1000,
          },
        ],
      }

      const result = parseImportData(batchData)

      expect(result).toHaveLength(2)
      expect(result[0]!.title).toBe('Chat 1')
      expect(result[1]!.title).toBe('Chat 2')
      expect(result[0]!.id).toBe('mocked-uuid')
      expect(result[1]!.id).toBe('mocked-uuid')
    })

    it('systemPromptが未定義の場合は空文字列を設定する', () => {
      const singleData = {
        title: 'Test Chat',
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(singleData)

      expect(result[0]!.systemPrompt).toBe('')
    })

    it('persistentMemoryが未定義の場合はデフォルト値を設定する', () => {
      const singleData = {
        title: 'Test Chat',
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(singleData)

      expect(result[0]!.persistentMemory).toEqual({
        characters: [],
        flags: [],
        gameDate: '',
        scenes: [],
        relationships: [],
      })
    })

    it('isArchivedが未定義の場合はfalseを設定する', () => {
      const singleData = {
        title: 'Test Chat',
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(singleData)

      expect(result[0]!.isArchived).toBe(false)
    })

    it('メッセージIDを新しく生成し直す', () => {
      const singleData = {
        title: 'Test Chat',
        messages: [
          { ...mockMessage, id: 'old-id-1' },
          { ...mockMessage, id: 'old-id-2' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(singleData)

      expect(result[0]!.messages[0]!.id).toBe('mocked-uuid')
      expect(result[0]!.messages[1]!.id).toBe('mocked-uuid')
    })

    it('無効なデータでエラーを投げる', () => {
      const invalidData = { invalid: 'data' }

      expect(() => parseImportData(invalidData)).toThrow('認識できないファイル形式です')
    })
  })

  describe('parseImportDataWithDuplicateCheck', () => {
    const existingChats: ChatSession[] = [
      {
        id: 'existing-1',
        title: 'Existing Chat',
        systemPrompt: '',
        messages: [mockMessage],
        persistentMemory: mockPersistentMemory,
        createdAt: 1000,
        updatedAt: 1000,
        isArchived: false,
      },
    ]

    it('skipDuplicatesがfalseの場合は重複チェックをスキップする', () => {
      const newData = {
        title: 'Existing Chat', // 既存と同じタイトル
        messages: [mockMessage],
        createdAt: 1000, // 既存と同じ作成日時
        updatedAt: 1000,
      }

      const result = parseImportDataWithDuplicateCheck(newData, existingChats, {
        skipDuplicates: false,
      })

      expect(result).toHaveLength(1)
      expect(result[0]!.title).toBe('Existing Chat')
    })

    it('デフォルトの重複チェックフィールド（title, createdAt）で重複を検出する', () => {
      const duplicateData = {
        title: 'Existing Chat',
        messages: [mockMessage],
        createdAt: 1000,
        updatedAt: 1000,
      }

      const result = parseImportDataWithDuplicateCheck(duplicateData, existingChats, {
        skipDuplicates: true,
      })

      expect(result).toHaveLength(0)
    })

    it('重複しないデータは通過させる', () => {
      const uniqueData = {
        title: 'New Chat',
        messages: [mockMessage],
        createdAt: 2000,
        updatedAt: 2000,
      }

      const result = parseImportDataWithDuplicateCheck(uniqueData, existingChats, {
        skipDuplicates: true,
      })

      expect(result).toHaveLength(1)
      expect(result[0]!.title).toBe('New Chat')
    })

    it('カスタム重複チェックフィールドで重複を検出する', () => {
      const duplicateData = {
        title: 'Different Title',
        messages: [mockMessage],
        createdAt: 1000, // 既存と同じ作成日時
        updatedAt: 1000,
      }

      const result = parseImportDataWithDuplicateCheck(duplicateData, existingChats, {
        skipDuplicates: true,
        duplicateCheckFields: ['createdAt'],
      })

      expect(result).toHaveLength(0)
    })

    it('messagesフィールドでの重複チェックが正しく動作する', () => {
      const duplicateData = {
        title: 'Different Title',
        messages: [mockMessage], // 既存と同じメッセージ
        createdAt: 2000,
        updatedAt: 2000,
      }

      const result = parseImportDataWithDuplicateCheck(duplicateData, existingChats, {
        skipDuplicates: true,
        duplicateCheckFields: ['messages'],
      })

      expect(result).toHaveLength(0)
    })

    it('複数のフィールドで重複チェックが正しく動作する', () => {
      const duplicateData = {
        title: 'Existing Chat',
        messages: [mockMessage],
        createdAt: 1000,
        updatedAt: 1000,
      }

      const result = parseImportDataWithDuplicateCheck(duplicateData, existingChats, {
        skipDuplicates: true,
        duplicateCheckFields: ['title', 'createdAt', 'messages'],
      })

      expect(result).toHaveLength(0)
    })

    it('一部のフィールドが異なる場合は重複とみなさない', () => {
      const differentData = {
        title: 'Existing Chat',
        messages: [{ ...mockMessage, content: 'Different content' }], // 内容が異なる
        createdAt: 1000,
        updatedAt: 1000,
      }

      const result = parseImportDataWithDuplicateCheck(differentData, existingChats, {
        skipDuplicates: true,
        duplicateCheckFields: ['title', 'createdAt', 'messages'],
      })

      expect(result).toHaveLength(1)
    })

    it('既存チャットが空の場合は重複チェックをスキップする', () => {
      const newData = {
        title: 'New Chat',
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportDataWithDuplicateCheck(newData, [], {
        skipDuplicates: true,
      })

      expect(result).toHaveLength(1)
    })

    it('バッチデータでの重複チェックが正しく動作する', () => {
      const batchData = {
        exportedAt: Date.now(),
        totalChats: 2,
        chats: [
          {
            title: 'Existing Chat', // 重複
            messages: [mockMessage],
            createdAt: 1000,
            updatedAt: 1000,
          },
          {
            title: 'New Chat', // 重複しない
            messages: [mockMessage],
            createdAt: 2000,
            updatedAt: 2000,
          },
        ],
      }

      const result = parseImportDataWithDuplicateCheck(batchData, existingChats, {
        skipDuplicates: true,
      })

      expect(result).toHaveLength(1)
      expect(result[0]!.title).toBe('New Chat')
    })
  })

  describe('エッジケース', () => {
    it('空のメッセージ配列を正しく処理する', () => {
      const emptyMessagesData = {
        title: 'Empty Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(emptyMessagesData)

      expect(result[0]!.messages).toEqual([])
    })

    it('複数のメッセージを持つチャットを正しく処理する', () => {
      const multipleMessagesData = {
        title: 'Multi Message Chat',
        messages: [
          { ...mockMessage, id: 'msg-1', role: 'user' as const, content: 'Hello' },
          { ...mockMessage, id: 'msg-2', role: 'assistant' as const, content: 'Hi there!' },
          { ...mockMessage, id: 'msg-3', role: 'user' as const, content: 'How are you?' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(multipleMessagesData)

      expect(result[0]!.messages).toHaveLength(3)
      expect(result[0]!.messages[0]!.content).toBe('Hello')
      expect(result[0]!.messages[1]!.content).toBe('Hi there!')
      expect(result[0]!.messages[2]!.content).toBe('How are you?')
    })

    it('非常に長いタイトルを正しく処理する', () => {
      const longTitle = 'A'.repeat(1000)
      const longTitleData = {
        title: longTitle,
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(longTitleData)

      expect(result[0]!.title).toBe(longTitle)
    })

    it('特殊文字を含むタイトルを正しく処理する', () => {
      const specialTitle = 'チャット 💬 "Special" Characters & Symbols!'
      const specialTitleData = {
        title: specialTitle,
        messages: [mockMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = parseImportData(specialTitleData)

      expect(result[0]!.title).toBe(specialTitle)
    })
  })
})
