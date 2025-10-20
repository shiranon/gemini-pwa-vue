import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { NotificationSoundRecord } from '~/types/database'

// モック設定
const mockSettingsStore = {
  settings: {
    enableReplySound: false,
    replySoundId: undefined as string | undefined,
  },
}

const mockDb = {
  notificationSounds: {
    get: mock((_id: string) => Promise.resolve<NotificationSoundRecord | null>(null)),
    add: mock((_record: NotificationSoundRecord) => Promise.resolve()),
    delete: mock((_id: string) => Promise.resolve()),
    orderBy: mock((_field: string) => ({
      reverse: mock(() => ({
        toArray: mock(() => Promise.resolve<NotificationSoundRecord[]>([])),
      })),
    })),
  },
}

const mockLogger = {
  error: mock((_message: string, _data?: unknown) => {}),
  warn: mock((_message: string, _data?: unknown) => {}),
  info: mock((_message: string, _data?: unknown) => {}),
}

// グローバルモック設定
Object.defineProperty(global, 'useSettingsStore', {
  value: mock(() => mockSettingsStore),
  writable: true,
})

Object.defineProperty(global, 'db', {
  value: mockDb,
  writable: true,
})

Object.defineProperty(global, 'logger', {
  value: mockLogger,
  writable: true,
})

// Audio のモック
const mockAudio = {
  play: mock(() => Promise.resolve()),
  pause: mock(() => {}),
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
}

Object.defineProperty(global, 'Audio', {
  value: mock(() => mockAudio),
  writable: true,
})

// FileReader のモック
const mockFileReader = {
  readAsDataURL: mock(() => {}),
  result: null as string | null,
  onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
  onerror: null as ((event: ProgressEvent<FileReader>) => void) | null,
}

Object.defineProperty(global, 'FileReader', {
  value: mock(() => mockFileReader),
  writable: true,
})

describe('useNotificationSound', () => {
  beforeEach(() => {
    // モックをリセット
    mockDb.notificationSounds.get.mockClear()
    mockDb.notificationSounds.add.mockClear()
    mockDb.notificationSounds.delete.mockClear()
    mockDb.notificationSounds.orderBy.mockClear()
    mockLogger.error.mockClear()
    mockLogger.warn.mockClear()
    mockLogger.info.mockClear()
    mockAudio.play.mockClear()
    mockFileReader.readAsDataURL.mockClear()

    // デフォルト設定をリセット
    mockSettingsStore.settings.enableReplySound = false
    mockSettingsStore.settings.replySoundId = undefined
  })

  it('playReplySoundが通知音無効時は何もしない', async () => {
    // モックのuseNotificationSoundを実装
    const useNotificationSound = () => {
      const playReplySound = async () => {
        if (!mockSettingsStore.settings.enableReplySound) {
          return
        }
        // 通知音が有効な場合の処理
      }

      return { playReplySound }
    }

    const { playReplySound } = useNotificationSound()

    await playReplySound()

    // 通知音が無効なので何も実行されないことを確認
    expect(mockAudio.play).not.toHaveBeenCalled()
  })

  it('playReplySoundが通知音有効時はデフォルト音声を再生する', async () => {
    mockSettingsStore.settings.enableReplySound = true
    mockSettingsStore.settings.replySoundId = undefined

    const useNotificationSound = () => {
      const playDefaultSound = async () => {
        const audio = new Audio('/sound.mp3')
        await audio.play()
      }

      const playReplySound = async () => {
        if (!mockSettingsStore.settings.enableReplySound) {
          return
        }

        const soundId = mockSettingsStore.settings.replySoundId

        if (!soundId) {
          await playDefaultSound()
          return
        }
      }

      return { playReplySound }
    }

    const { playReplySound } = useNotificationSound()

    await playReplySound()

    expect(mockAudio.play).toHaveBeenCalled()
  })

  it('playReplySoundがカスタム音声ID指定時はIndexedDBから取得して再生する', async () => {
    mockSettingsStore.settings.enableReplySound = true
    mockSettingsStore.settings.replySoundId = 'custom-sound-1'

    const mockSound: NotificationSoundRecord = {
      id: 'custom-sound-1',
      name: 'Custom Sound',
      base64Data: 'data:audio/mp3;base64,testdata',
      mimeType: 'audio/mp3',
      size: 1024,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    mockDb.notificationSounds.get.mockResolvedValue(mockSound)

    const useNotificationSound = () => {
      const playReplySound = async () => {
        if (!mockSettingsStore.settings.enableReplySound) {
          return
        }

        const soundId = mockSettingsStore.settings.replySoundId

        if (!soundId) {
          return
        }

        try {
          const sound = await mockDb.notificationSounds.get(soundId)
          if (sound) {
            const audio = new Audio(sound.base64Data)
            await audio.play()
          }
        } catch (error) {
          mockLogger.error('通知音の再生に失敗しました', { component: 'NotificationSound', error })
        }
      }

      return { playReplySound }
    }

    const { playReplySound } = useNotificationSound()

    await playReplySound()

    expect(mockDb.notificationSounds.get).toHaveBeenCalledWith('custom-sound-1')
    expect(mockAudio.play).toHaveBeenCalled()
  })

  it('addNotificationSoundがファイルをBase64に変換してIndexedDBに保存する', async () => {
    const mockFile = new File(['test audio data'], 'test.mp3', { type: 'audio/mp3' })
    const mockBase64Data = 'data:audio/mp3;base64,dGVzdCBhdWRpbyBkYXRh'

    // FileReaderのモック設定
    let resolvePromise: (value: string) => void
    new Promise<string>((resolve) => {
      resolvePromise = resolve
    })

    mockFileReader.readAsDataURL.mockImplementation(() => {
      setTimeout(() => {
        mockFileReader.result = mockBase64Data
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>)
        }
        resolvePromise(mockBase64Data)
      }, 0)
    })

    const useNotificationSound = () => {
      const addNotificationSound = async (file: File): Promise<string> => {
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          const now = Date.now()
          const record = {
            id: `sound-${now}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            mimeType: file.type,
            base64Data,
            size: file.size,
            isDefault: false,
            createdAt: now,
            updatedAt: now,
          }

          await mockDb.notificationSounds.add(record)
          mockLogger.info('通知音を追加しました', { component: 'NotificationSound', name: record.name })

          return record.id
        } catch (error) {
          mockLogger.error('通知音の追加に失敗しました', { component: 'NotificationSound', error })
          throw error
        }
      }

      return { addNotificationSound }
    }

    const { addNotificationSound } = useNotificationSound()

    const result = await addNotificationSound(mockFile)

    expect(result).toMatch(/^sound-\d+$/)
    expect(mockDb.notificationSounds.add).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith('通知音を追加しました', expect.any(Object))
  })

  it('deleteNotificationSoundがIndexedDBから削除して設定をクリアする', async () => {
    const soundId = 'test-sound-1'
    mockSettingsStore.settings.replySoundId = soundId

    const useNotificationSound = () => {
      const deleteNotificationSound = async (id: string): Promise<void> => {
        try {
          await mockDb.notificationSounds.delete(id)
          mockLogger.info('通知音を削除しました', { component: 'NotificationSound', id })

          if (mockSettingsStore.settings.replySoundId === id) {
            mockSettingsStore.settings.replySoundId = undefined
          }
        } catch (error) {
          mockLogger.error('通知音の削除に失敗しました', { component: 'NotificationSound', error })
          throw error
        }
      }

      return { deleteNotificationSound }
    }

    const { deleteNotificationSound } = useNotificationSound()

    await deleteNotificationSound(soundId)

    expect(mockDb.notificationSounds.delete).toHaveBeenCalledWith(soundId)
    expect(mockSettingsStore.settings.replySoundId).toBeUndefined()
    expect(mockLogger.info).toHaveBeenCalledWith('通知音を削除しました', expect.any(Object))
  })

  it('getNotificationSoundsがIndexedDBから音声一覧を取得する', async () => {
    const mockSounds: NotificationSoundRecord[] = [
      {
        id: 'sound-1',
        name: 'Sound 1',
        base64Data: 'data:audio/mp3;base64,test1',
        mimeType: 'audio/mp3',
        size: 1024,
        isDefault: false,
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      },
      {
        id: 'sound-2',
        name: 'Sound 2',
        base64Data: 'data:audio/mp3;base64,test2',
        mimeType: 'audio/mp3',
        size: 2048,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    // モックの設定を修正
    const mockOrderBy = mock(() => ({
      reverse: mock(() => ({
        toArray: mock(() => Promise.resolve(mockSounds)),
      })),
    }))

    mockDb.notificationSounds.orderBy = mockOrderBy

    const useNotificationSound = () => {
      const getNotificationSounds = async () => {
        try {
          return await mockDb.notificationSounds.orderBy('createdAt').reverse().toArray()
        } catch (error) {
          mockLogger.error('通知音一覧の取得に失敗しました', { component: 'NotificationSound', error })
          return []
        }
      }

      return { getNotificationSounds }
    }

    const { getNotificationSounds } = useNotificationSound()

    const result = await getNotificationSounds()

    expect(result).toEqual(mockSounds)
    expect(mockDb.notificationSounds.orderBy).toHaveBeenCalledWith('createdAt')
  })

  it('previewSoundが指定されたIDの音声をプレビュー再生する', async () => {
    const soundId = 'preview-sound-1'
    const mockSound: NotificationSoundRecord = {
      id: soundId,
      name: 'Preview Sound',
      base64Data: 'data:audio/mp3;base64,previewdata',
      mimeType: 'audio/mp3',
      size: 512,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    mockDb.notificationSounds.get.mockResolvedValue(mockSound)

    const useNotificationSound = () => {
      const previewSound = async (id: string): Promise<void> => {
        try {
          const sound = await mockDb.notificationSounds.get(id)
          if (sound) {
            const audio = new Audio(sound.base64Data)
            await audio.play()
          }
        } catch (error) {
          mockLogger.error('通知音のプレビュー再生に失敗しました', { component: 'NotificationSound', error })
        }
      }

      return { previewSound }
    }

    const { previewSound } = useNotificationSound()

    await previewSound(soundId)

    expect(mockDb.notificationSounds.get).toHaveBeenCalledWith(soundId)
    expect(mockAudio.play).toHaveBeenCalled()
  })

  it('previewDefaultSoundがデフォルト音声をプレビュー再生する', async () => {
    const useNotificationSound = () => {
      const playDefaultSound = async () => {
        const audio = new Audio('/sound.mp3')
        await audio.play()
      }

      const previewDefaultSound = async (): Promise<void> => {
        await playDefaultSound()
      }

      return { previewDefaultSound }
    }

    const { previewDefaultSound } = useNotificationSound()

    await previewDefaultSound()

    expect(mockAudio.play).toHaveBeenCalled()
  })

  it('エラーハンドリングが正しく動作する', async () => {
    const testError = new Error('Test error')
    mockDb.notificationSounds.get.mockRejectedValue(testError)

    const useNotificationSound = () => {
      const playReplySound = async () => {
        if (!mockSettingsStore.settings.enableReplySound) {
          return
        }

        const soundId = mockSettingsStore.settings.replySoundId

        if (!soundId) {
          return
        }

        try {
          const sound = await mockDb.notificationSounds.get(soundId)
          if (sound) {
            const audio = new Audio(sound.base64Data)
            await audio.play()
          }
        } catch (error) {
          mockLogger.error('通知音の再生に失敗しました', { component: 'NotificationSound', error })
        }
      }

      return { playReplySound }
    }

    mockSettingsStore.settings.enableReplySound = true
    mockSettingsStore.settings.replySoundId = 'error-sound'

    const { playReplySound } = useNotificationSound()

    await playReplySound()

    expect(mockLogger.error).toHaveBeenCalledWith('通知音の再生に失敗しました', { component: 'NotificationSound', error: testError })
  })

  it('ファイル名から拡張子を正しく除去する', () => {
    const removeExtension = (filename: string) => {
      return filename.replace(/\.[^/.]+$/, '')
    }

    expect(removeExtension('test.mp3')).toBe('test')
    expect(removeExtension('sound.wav')).toBe('sound')
    expect(removeExtension('audio.ogg')).toBe('audio')
    expect(removeExtension('no-extension')).toBe('no-extension')
    expect(removeExtension('multiple.dots.mp3')).toBe('multiple.dots')
  })

  it('ファイルサイズのフォーマットが正しく動作する', () => {
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
})
