import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

// ~/lib/ids のモック
let mockIdCounter = 0
mock.module('~/lib/ids', () => ({
  generateFileId: () => `file_${Date.now()}_mock${mockIdCounter++}`,
  generateChatId: () => `chat_${Date.now()}_mock${mockIdCounter++}`,
  generateMessageId: () => `msg_${Date.now()}_mock${mockIdCounter++}`,
}))

// eslint-disable-next-line import/first
import { convertFileToAttachedFile, downloadJson } from '~/lib/file'

// FileReader のモック
class MockFileReader {
  result: string | null = null
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null

  readAsDataURL(file: File): void {
    // モックのBase64データを生成
    const mockBase64 = btoa('test content')
    this.result = `data:${file.type};base64,${mockBase64}`

    // 非同期でonloadを呼び出し
    setTimeout(() => {
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>)
      }
    }, 0)
  }
}

// グローバルなFileReaderをモック
const originalFileReader = global.FileReader

// URL.createObjectURL と URL.revokeObjectURL のモック
const mockCreateObjectURL = mock(() => 'mock-url')
const mockRevokeObjectURL = mock(() => {})

// document.createElement のモック
const mockCreateElement = mock((): HTMLAnchorElement => {
  const element = {
    href: '',
    download: '',
    click: mock(() => {}),
  } as Partial<HTMLAnchorElement> as HTMLAnchorElement
  return element
})

// document.body のモック
const mockBody = {
  appendChild: mock(() => {}),
  removeChild: mock(() => {}),
}

describe('convertFileToAttachedFile', () => {
  beforeEach(() => {
    // FileReaderをモックに置き換え
    global.FileReader = MockFileReader as unknown as typeof global.FileReader
  })

  afterEach(() => {
    // 元のFileReaderを復元
    global.FileReader = originalFileReader
  })

  it('should convert File to AttachedFile format', async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const result = await convertFileToAttachedFile(mockFile)

    expect(result).toBeDefined()
    expect(result.name).toBe('test.txt')
    expect(result.type).toMatch(/^text\/plain/)
    expect(result.size).toBe(mockFile.size)
    expect(result.data).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.createdAt).toBeDefined()
    expect(typeof result.id).toBe('string')
    expect(typeof result.createdAt).toBe('number')
  })

  it('should generate unique IDs for different files', async () => {
    const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
    const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' })

    const result1 = await convertFileToAttachedFile(file1)
    const result2 = await convertFileToAttachedFile(file2)

    expect(result1.id).not.toBe(result2.id)
  })

  it('should preserve file properties correctly', async () => {
    const mockFile = new File(['large content'], 'document.pdf', { type: 'application/pdf' })
    const result = await convertFileToAttachedFile(mockFile)

    expect(result.name).toBe('document.pdf')
    expect(result.type).toBe('application/pdf')
    expect(result.size).toBe(mockFile.size)
  })

  it('should handle different file types', async () => {
    const testCases = [
      { name: 'image.png', type: 'image/png' },
      { name: 'document.pdf', type: 'application/pdf' },
      { name: 'data.json', type: 'application/json' },
      { name: 'audio.mp3', type: 'audio/mpeg' },
    ]

    for (const testCase of testCases) {
      const file = new File(['content'], testCase.name, { type: testCase.type })
      const result = await convertFileToAttachedFile(file)

      expect(result.name).toBe(testCase.name)
      expect(result.type).toMatch(new RegExp(`^${testCase.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    }
  })

  it('should handle empty files', async () => {
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' })
    const result = await convertFileToAttachedFile(emptyFile)

    expect(result.name).toBe('empty.txt')
    expect(result.size).toBe(0)
    expect(result.data).toBeDefined()
  })

  it('should handle files with special characters in names', async () => {
    const specialNameFile = new File(['content'], 'ファイル名 with spaces & symbols!.txt', { type: 'text/plain' })
    const result = await convertFileToAttachedFile(specialNameFile)

    expect(result.name).toBe('ファイル名 with spaces & symbols!.txt')
  })

  it('should generate IDs with correct format', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    const result = await convertFileToAttachedFile(file)

    // IDは "file_" で始まり、タイムスタンプとランダム文字列を含む
    expect(result.id).toMatch(/^file_\d+_[a-z0-9]+$/)
  })

  it('should handle large files', async () => {
    // 大きなファイルのシミュレーション
    const largeContent = 'x'.repeat(1000000) // 1MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' })
    const result = await convertFileToAttachedFile(largeFile)

    expect(result.size).toBe(largeFile.size)
    expect(result.data).toBeDefined()
  })

  it('should handle binary files', async () => {
    // バイナリファイルのシミュレーション
    const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) // PNG header
    const binaryFile = new File([binaryContent], 'image.png', { type: 'image/png' })
    const result = await convertFileToAttachedFile(binaryFile)

    expect(result.name).toBe('image.png')
    expect(result.type).toBe('image/png')
    expect(result.data).toBeDefined()
  })
})

describe('downloadJson', () => {
  beforeEach(() => {
    // URL.createObjectURL をモック
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    // document.createElement をモック
    global.document.createElement = mockCreateElement

    // document.body をモック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.document.body = mockBody as any
  })

  afterEach(() => {
    // モックの呼び出し回数をリセット
    mockCreateObjectURL.mockClear()
    mockRevokeObjectURL.mockClear()
    mockCreateElement.mockClear()
    mockBody.appendChild.mockClear()
    mockBody.removeChild.mockClear()
  })

  it('should download JSON data correctly', () => {
    const testData = { name: 'test', value: 123 }
    const filename = 'test.json'

    expect(() => downloadJson(testData, filename)).not.toThrow()

    // モックが正しく呼び出されることを確認
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockCreateElement).toHaveBeenCalled()
    expect(mockBody.appendChild).toHaveBeenCalled()
    expect(mockBody.removeChild).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })

  it('should handle complex JSON data', () => {
    const complexData = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      settings: {
        theme: 'dark',
        language: 'ja',
      },
    }
    const filename = 'complex.json'

    expect(() => downloadJson(complexData, filename)).not.toThrow()
  })

  it('should handle null and undefined values', () => {
    const dataWithNulls = {
      nullValue: null,
      undefinedValue: undefined,
      emptyString: '',
    }
    const filename = 'nulls.json'

    expect(() => downloadJson(dataWithNulls, filename)).not.toThrow()
  })

  it('should handle arrays', () => {
    const arrayData = [1, 2, 3, 'test', { nested: true }]
    const filename = 'array.json'

    expect(() => downloadJson(arrayData, filename)).not.toThrow()
  })

  it('should handle empty objects', () => {
    const emptyData = {}
    const filename = 'empty.json'

    expect(() => downloadJson(emptyData, filename)).not.toThrow()
  })

  it('should handle special characters in data', () => {
    const specialData = {
      unicode: 'こんにちは',
      symbols: '!@#$%^&*()',
      quotes: '"double" and \'single\'',
    }
    const filename = 'special.json'

    expect(() => downloadJson(specialData, filename)).not.toThrow()
  })

  it('should handle large data structures', () => {
    const largeData = {
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: 'x'.repeat(100),
      })),
    }
    const filename = 'large.json'

    expect(() => downloadJson(largeData, filename)).not.toThrow()
  })

  it('should handle circular references gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circularData: any = { name: 'test' }
    circularData.self = circularData
    const filename = 'circular.json'

    // 循環参照はJSON.stringifyでエラーになるが、関数内でキャッチされる
    expect(() => downloadJson(circularData, filename)).toThrow()
  })

  it('should handle invalid filename characters', () => {
    const testData = { name: 'test' }
    const filename = 'file/with\\invalid:chars.json'

    expect(() => downloadJson(testData, filename)).not.toThrow()
  })
})
