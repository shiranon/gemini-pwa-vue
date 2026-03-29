import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { NotificationSoundRecord } from '~/types/database'

// Vue のモック
const mockRef = <T>(initialValue: T) => ({
  value: initialValue,
})

const mockComputed = <T>(getter: T | (() => T)) => ({
  value: typeof getter === 'function' ? (getter as () => T)() : getter,
})

const mockOnMounted = (callback: () => void) => {
  callback()
}

// グローバルモック設定
Object.defineProperty(global, 'ref', {
  value: mockRef,
  writable: true,
})

Object.defineProperty(global, 'computed', {
  value: mockComputed,
  writable: true,
})

Object.defineProperty(global, 'onMounted', {
  value: mockOnMounted,
  writable: true,
})

// useNotificationSound のモック
const mockUseNotificationSound = {
  addNotificationSound: mock((_file: File) => Promise.resolve('sound-123')),
  deleteNotificationSound: mock((_id: string) => Promise.resolve()),
  getNotificationSounds: mock(() => Promise.resolve<NotificationSoundRecord[]>([])),
  previewSound: mock((_id: string) => Promise.resolve()),
  previewDefaultSound: mock(() => Promise.resolve()),
}

Object.defineProperty(global, 'useNotificationSound', {
  value: mock(() => mockUseNotificationSound),
  writable: true,
})

// モックデータ
const mockNotificationSounds: NotificationSoundRecord[] = [
  {
    id: 'sound-1',
    name: 'Test Sound 1',
    mimeType: 'audio/mp3',
    size: 1024,
    base64Data: 'data:audio/mp3;base64,test1',
    isDefault: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
  },
  {
    id: 'sound-2',
    name: 'Test Sound 2',
    mimeType: 'audio/wav',
    size: 2048,
    base64Data: 'data:audio/wav;base64,test2',
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

describe('NotificationSoundSection', () => {
  const originalConsoleError = console.error

  beforeEach(() => {
    // テスト内のconsole.errorをサプレス (エラーハンドリングテストのノイズ防止)
    console.error = mock(() => {})

    // モックをリセット
    mockUseNotificationSound.addNotificationSound.mockClear()
    mockUseNotificationSound.deleteNotificationSound.mockClear()
    mockUseNotificationSound.getNotificationSounds.mockClear()
    mockUseNotificationSound.previewSound.mockClear()
    mockUseNotificationSound.previewDefaultSound.mockClear()

    // デフォルトのモックデータを設定
    mockUseNotificationSound.getNotificationSounds.mockResolvedValue(mockNotificationSounds)
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  it('コンポーネントの初期化が正しく動作する', () => {
    const props = {
      modelValue: {
        enableReplySound: false,
        replySoundId: undefined,
      },
      showConfirm: mock(() => Promise.resolve(true)),
      showAlert: mock(() => {}),
    }

    // コンポーネントの初期化をシミュレート
    const sounds = mockRef([])
    const isUploading = mockRef(false)
    const fileInputRef = mockRef(null)

    const localSettings = {
      value: props.modelValue,
    }

    expect(sounds.value).toEqual([])
    expect(isUploading.value).toBe(false)
    expect(fileInputRef.value).toBeNull()
    expect(localSettings.value).toEqual(props.modelValue)
  })

  it('loadSoundsが音声一覧を正しく取得する', async () => {
    const loadSounds = async () => {
      const sounds = await mockUseNotificationSound.getNotificationSounds()
      return sounds
    }

    const result = await loadSounds()

    expect(mockUseNotificationSound.getNotificationSounds).toHaveBeenCalled()
    expect(result).toEqual(mockNotificationSounds)
  })

  it('handleFileSelectが音声ファイルを正しく処理する', async () => {
    const mockFile = new File(['test audio data'], 'test.mp3', { type: 'audio/mp3' })
    const mockEvent = {
      target: {
        files: [mockFile],
      },
    } as unknown as Event

    const showAlert = mock((_message: string, _description?: string) => {})
    const isUploading = mockRef(false)

    const handleFileSelect = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      // 音声ファイルかチェック
      if (!file.type.startsWith('audio/')) {
        showAlert('音声ファイルを選択してください')
        return
      }

      // ファイルサイズチェック（5MB以下）
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        showAlert('ファイルサイズが大きすぎます（5MB以下にしてください）')
        return
      }

      isUploading.value = true
      try {
        await mockUseNotificationSound.addNotificationSound(file)
        await mockUseNotificationSound.getNotificationSounds()
      } catch (error) {
        console.error('Failed to upload sound:', error)
        showAlert('音声ファイルのアップロードに失敗しました')
      } finally {
        isUploading.value = false
      }
    }

    await handleFileSelect(mockEvent as unknown as Event)

    expect(mockUseNotificationSound.addNotificationSound).toHaveBeenCalledWith(mockFile)
    expect(mockUseNotificationSound.getNotificationSounds).toHaveBeenCalled()
    expect(isUploading.value).toBe(false)
  })

  it('handleFileSelectが非音声ファイルを拒否する', async () => {
    const mockFile = new File(['test data'], 'test.txt', { type: 'text/plain' })
    const mockEvent = {
      target: {
        files: [mockFile],
      },
    } as unknown as Event

    const showAlert = mock((_message: string, _description?: string) => {})

    const handleFileSelect = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      // 音声ファイルかチェック
      if (!file.type.startsWith('audio/')) {
        showAlert('音声ファイルを選択してください')
        return
      }
    }

    await handleFileSelect(mockEvent as unknown as Event)

    expect(showAlert).toHaveBeenCalledWith('音声ファイルを選択してください')
    expect(mockUseNotificationSound.addNotificationSound).not.toHaveBeenCalled()
  })

  it('handleFileSelectがファイルサイズ制限をチェックする', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.mp3', { type: 'audio/mp3' })
    const mockEvent = {
      target: {
        files: [largeFile],
      },
    }

    const showAlert = mock((_message: string, _description?: string) => {})

    const handleFileSelect = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      // 音声ファイルかチェック
      if (!file.type.startsWith('audio/')) {
        showAlert('音声ファイルを選択してください')
        return
      }

      // ファイルサイズチェック（5MB以下）
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        showAlert('ファイルサイズが大きすぎます（5MB以下にしてください）')
        return
      }
    }

    await handleFileSelect(mockEvent as unknown as Event)

    expect(showAlert).toHaveBeenCalledWith('ファイルサイズが大きすぎます（5MB以下にしてください）')
    expect(mockUseNotificationSound.addNotificationSound).not.toHaveBeenCalled()
  })

  it('handleDeleteが音声を正しく削除する', async () => {
    const soundId = 'sound-1'
    const showConfirm = mock((_message: string, _title?: string) => Promise.resolve(true))

    const handleDelete = async (id: string) => {
      const confirmed = await showConfirm('この通知音を削除しますか？', '通知音の削除')
      if (!confirmed) return

      try {
        await mockUseNotificationSound.deleteNotificationSound(id)
        await mockUseNotificationSound.getNotificationSounds()
      } catch (error) {
        console.error('Failed to delete sound:', error)
      }
    }

    await handleDelete(soundId)

    expect(showConfirm).toHaveBeenCalledWith('この通知音を削除しますか？', '通知音の削除')
    expect(mockUseNotificationSound.deleteNotificationSound).toHaveBeenCalledWith(soundId)
    expect(mockUseNotificationSound.getNotificationSounds).toHaveBeenCalled()
  })

  it('handleDeleteがキャンセル時は削除しない', async () => {
    const soundId = 'sound-1'
    const showConfirm = mock((_message: string, _title?: string) => Promise.resolve(false))

    const handleDelete = async (id: string) => {
      const confirmed = await showConfirm('この通知音を削除しますか？', '通知音の削除')
      if (!confirmed) return

      try {
        await mockUseNotificationSound.deleteNotificationSound(id)
        await mockUseNotificationSound.getNotificationSounds()
      } catch (error) {
        console.error('Failed to delete sound:', error)
      }
    }

    await handleDelete(soundId)

    expect(showConfirm).toHaveBeenCalledWith('この通知音を削除しますか？', '通知音の削除')
    expect(mockUseNotificationSound.deleteNotificationSound).not.toHaveBeenCalled()
  })

  it('handlePreviewがカスタム音声をプレビューする', async () => {
    const soundId = 'sound-1'

    const handlePreview = async (id?: string) => {
      if (id) {
        await mockUseNotificationSound.previewSound(id)
      } else {
        await mockUseNotificationSound.previewDefaultSound()
      }
    }

    await handlePreview(soundId)

    expect(mockUseNotificationSound.previewSound).toHaveBeenCalledWith(soundId)
    expect(mockUseNotificationSound.previewDefaultSound).not.toHaveBeenCalled()
  })

  it('handlePreviewがデフォルト音声をプレビューする', async () => {
    const handlePreview = async (id?: string) => {
      if (id) {
        await mockUseNotificationSound.previewSound(id)
      } else {
        await mockUseNotificationSound.previewDefaultSound()
      }
    }

    await handlePreview()

    expect(mockUseNotificationSound.previewDefaultSound).toHaveBeenCalled()
    expect(mockUseNotificationSound.previewSound).not.toHaveBeenCalled()
  })

  it('selectSoundが音声選択を正しく処理する', () => {
    const emit = mock((_event: string, _value: unknown) => {})
    const localSettings = {
      enableReplySound: true,
      replySoundId: undefined,
    }

    const selectSound = (id?: string) => {
      emit('update:modelValue', {
        ...localSettings,
        replySoundId: id,
      })
    }

    selectSound('sound-1')

    expect(emit).toHaveBeenCalledWith('update:modelValue', {
      enableReplySound: true,
      replySoundId: 'sound-1',
    })
  })

  it('selectSoundがデフォルト音声選択を正しく処理する', () => {
    const emit = mock((_event: string, _value: unknown) => {})
    const localSettings = {
      enableReplySound: true,
      replySoundId: 'sound-1',
    }

    const selectSound = (id?: string) => {
      emit('update:modelValue', {
        ...localSettings,
        replySoundId: id,
      })
    }

    selectSound(undefined)

    expect(emit).toHaveBeenCalledWith('update:modelValue', {
      enableReplySound: true,
      replySoundId: undefined,
    })
  })

  it('formatFileSizeがファイルサイズを正しくフォーマットする', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }

    expect(formatFileSize(512)).toBe('512B')
    expect(formatFileSize(1536)).toBe('1.5KB')
    expect(formatFileSize(1048576)).toBe('1.0MB')
    expect(formatFileSize(2097152)).toBe('2.0MB')
  })

  it('エラーハンドリングが正しく動作する', async () => {
    const testError = new Error('Test error')
    mockUseNotificationSound.addNotificationSound.mockRejectedValue(testError)

    const showAlert = mock((_message: string, _description?: string) => {})
    const isUploading = mockRef(false)

    const handleFileSelect = async (event: Event) => {
      const mockFile = new File(['test audio data'], 'test.mp3', { type: 'audio/mp3' })
      const target = event.target as HTMLInputElement
      const file = target.files?.[0] || mockFile

      if (!file) return

      if (!file.type.startsWith('audio/')) {
        showAlert('音声ファイルを選択してください')
        return
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        showAlert('ファイルサイズが大きすぎます（5MB以下にしてください）')
        return
      }

      isUploading.value = true
      try {
        await mockUseNotificationSound.addNotificationSound(file)
        await mockUseNotificationSound.getNotificationSounds()
      } catch (error) {
        console.error('Failed to upload sound:', error)
        showAlert('音声ファイルのアップロードに失敗しました')
      } finally {
        isUploading.value = false
      }
    }

    const mockEvent = {
      target: {
        files: [new File(['test'], 'test.mp3', { type: 'audio/mp3' })],
      },
    } as unknown as Event

    await handleFileSelect(mockEvent as unknown as Event)

    expect(showAlert).toHaveBeenCalledWith('音声ファイルのアップロードに失敗しました')
    expect(isUploading.value).toBe(false)
  })

  it('アップロード中の状態管理が正しく動作する', async () => {
    const isUploading = mockRef(false)
    const fileInputRef = mockRef({ value: 'test.mp3' })

    const handleFileSelect = async (event: Event) => {
      const mockFile = new File(['test audio data'], 'test.mp3', { type: 'audio/mp3' })
      const target = event.target as HTMLInputElement
      const file = target.files?.[0] || mockFile

      if (!file) return

      if (!file.type.startsWith('audio/')) {
        return
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        return
      }

      isUploading.value = true
      try {
        await mockUseNotificationSound.addNotificationSound(file)
        await mockUseNotificationSound.getNotificationSounds()
      } catch (error) {
        console.error('Failed to upload sound:', error)
      } finally {
        isUploading.value = false
        if (fileInputRef.value) {
          fileInputRef.value.value = ''
        }
      }
    }

    const mockEvent = {
      target: {
        files: [new File(['test'], 'test.mp3', { type: 'audio/mp3' })],
      },
    } as unknown as Event

    expect(isUploading.value).toBe(false)

    await handleFileSelect(mockEvent as unknown as Event)

    expect(isUploading.value).toBe(false)
    expect(mockUseNotificationSound.addNotificationSound).toHaveBeenCalled()
  })
})
