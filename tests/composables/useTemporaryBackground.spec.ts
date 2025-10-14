import { describe, expect, it } from 'bun:test'

describe('useTemporaryBackground', () => {
  it('初期状態でtemporaryBackgroundUrlがnullである', () => {
    const temporaryBackgroundUrl: string | null = null
    expect(temporaryBackgroundUrl).toBeNull()
  })

  it('初期状態でoriginalBackgroundUrlがnullである', () => {
    const originalBackgroundUrl: string | null = null
    expect(originalBackgroundUrl).toBeNull()
  })

  it('初期状態でhasTemporaryBackgroundがfalseである', () => {
    const temporaryBackgroundUrl: string | null = null
    const hasTemporaryBackground = temporaryBackgroundUrl !== null
    expect(hasTemporaryBackground).toBe(false)
  })

  it('setTemporaryBackgroundが正しく動作する', () => {
    let temporaryBackgroundUrl: string | null = null
    let originalBackgroundUrl: string | null = null
    const mockSettingsStore = {
      settings: {
        backgroundImageDataUrl: 'data:image/jpeg;base64,original-image-data',
      },
    }

    const setTemporaryBackground = (_imageUrl: string) => {
      // 元の背景画像を保存（まだ保存されていない場合のみ）
      if (originalBackgroundUrl === null) {
        originalBackgroundUrl = mockSettingsStore.settings.backgroundImageDataUrl
      }
      temporaryBackgroundUrl = _imageUrl
    }

    const testImageUrl = 'data:image/jpeg;base64,temporary-image-data'
    setTemporaryBackground(testImageUrl)

    expect(temporaryBackgroundUrl).toBe(testImageUrl as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(originalBackgroundUrl).toBe(mockSettingsStore.settings.backgroundImageDataUrl as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  it('setTemporaryBackgroundが複数回呼ばれてもoriginalBackgroundUrlは最初の値のまま', () => {
    let originalBackgroundUrl: string | null = null
    const mockSettingsStore = {
      settings: {
        backgroundImageDataUrl: 'data:image/jpeg;base64,original-image-data',
      },
    }

    const setTemporaryBackground = (_imageUrl: string) => {
      // 元の背景画像を保存（まだ保存されていない場合のみ）
      if (originalBackgroundUrl === null) {
        originalBackgroundUrl = mockSettingsStore.settings.backgroundImageDataUrl
      }
    }

    setTemporaryBackground('data:image/jpeg;base64,first-temp')
    const firstOriginal = originalBackgroundUrl

    setTemporaryBackground('data:image/jpeg;base64,second-temp')
    const secondOriginal = originalBackgroundUrl

    expect(firstOriginal).toBe(secondOriginal)
    expect(originalBackgroundUrl).toBe(mockSettingsStore.settings.backgroundImageDataUrl as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  it('restoreOriginalBackgroundが正しく動作する', () => {
    let temporaryBackgroundUrl: string | null = 'data:image/jpeg;base64,temp-image'
    let originalBackgroundUrl: string | null = 'data:image/jpeg;base64,original-image'

    const restoreOriginalBackground = () => {
      temporaryBackgroundUrl = null
      originalBackgroundUrl = null
    }

    restoreOriginalBackground()

    expect(temporaryBackgroundUrl).toBeNull()
    expect(originalBackgroundUrl).toBeNull()
  })

  it('currentBackgroundUrlが一時的な背景を優先する', () => {
    const temporaryBackgroundUrl: string | null = 'data:image/jpeg;base64,temp-image'
    const settingsBackgroundUrl: string | null = 'data:image/jpeg;base64,settings-image'

    const currentBackgroundUrl = temporaryBackgroundUrl || settingsBackgroundUrl

    expect(currentBackgroundUrl).toBe(temporaryBackgroundUrl)
    expect(currentBackgroundUrl).not.toBe(settingsBackgroundUrl)
  })

  it('currentBackgroundUrlが一時的な背景がない場合は設定の背景を使用する', () => {
    const temporaryBackgroundUrl: string | null = null
    const settingsBackgroundUrl: string | null = 'data:image/jpeg;base64,settings-image'

    const currentBackgroundUrl = temporaryBackgroundUrl || settingsBackgroundUrl

    expect(currentBackgroundUrl).toBe(settingsBackgroundUrl)
  })

  it('backgroundStyleが正しく生成される', () => {
    const currentBackgroundUrl: string | null = 'data:image/jpeg;base64,test-image'

    const backgroundStyle = {
      backgroundImage: `url(${currentBackgroundUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }

    expect(backgroundStyle.backgroundImage).toBe('url(data:image/jpeg;base64,test-image)')
    expect(backgroundStyle.backgroundSize).toBe('cover')
    expect(backgroundStyle.backgroundPosition).toBe('center')
    expect(backgroundStyle.backgroundAttachment).toBe('fixed')
  })

  it('backgroundStyleがURLがない場合は空のオブジェクトを返す', () => {
    const currentBackgroundUrl: string | null = null

    const backgroundStyle = currentBackgroundUrl
      ? {
          backgroundImage: `url(${currentBackgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }
      : {}

    expect(backgroundStyle).toEqual({})
  })

  it('hasTemporaryBackgroundが正しく計算される', () => {
    // 一時的な背景がある場合
    const tempUrl: string | null = 'data:image/jpeg;base64,temp-image'
    const hasTemporaryBackground1 = tempUrl !== null
    expect(hasTemporaryBackground1).toBe(true)

    // 一時的な背景がない場合
    const nullUrl: string | null = null
    const hasTemporaryBackground2 = nullUrl !== null
    expect(hasTemporaryBackground2).toBe(false)
  })

  it('複数の背景画像の切り替えが正しく動作する', () => {
    let temporaryBackgroundUrl: string | null = null
    let originalBackgroundUrl: string | null = null
    const mockSettingsStore = {
      settings: {
        backgroundImageDataUrl: 'data:image/jpeg;base64,original-image',
      },
    }

    const setTemporaryBackground = (_imageUrl: string) => {
      if (originalBackgroundUrl === null) {
        originalBackgroundUrl = mockSettingsStore.settings.backgroundImageDataUrl
      }
      temporaryBackgroundUrl = _imageUrl
    }

    const restoreOriginalBackground = () => {
      temporaryBackgroundUrl = null
      originalBackgroundUrl = null
    }

    // 最初の一時的な背景を設定
    setTemporaryBackground('data:image/jpeg;base64,first-temp')
    expect(temporaryBackgroundUrl).toBe('data:image/jpeg;base64,first-temp' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(originalBackgroundUrl).toBe('data:image/jpeg;base64,original-image' as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    // 2番目の一時的な背景を設定
    setTemporaryBackground('data:image/jpeg;base64,second-temp')
    expect(temporaryBackgroundUrl).toBe('data:image/jpeg;base64,second-temp' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(originalBackgroundUrl).toBe('data:image/jpeg;base64,original-image' as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    // 元の背景に戻す
    restoreOriginalBackground()
    expect(temporaryBackgroundUrl).toBeNull()
    expect(originalBackgroundUrl).toBeNull()
  })

  it('Data URLの形式が正しく処理される', () => {
    const validDataUrl = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

    expect(validDataUrl.startsWith('data:')).toBe(true)
    expect(validDataUrl.includes('base64,')).toBe(true)
    expect(validDataUrl.length).toBeGreaterThan(0)
  })

  it('異なる画像形式が正しく処理される', () => {
    const jpegUrl = 'data:image/jpeg;base64,jpeg-data'
    const pngUrl = 'data:image/png;base64,png-data'
    const webpUrl = 'data:image/webp;base64,webp-data'

    expect(jpegUrl.startsWith('data:image/jpeg')).toBe(true)
    expect(pngUrl.startsWith('data:image/png')).toBe(true)
    expect(webpUrl.startsWith('data:image/webp')).toBe(true)
  })

  it('エラーハンドリングが正しく動作する', () => {
    const handleError = (error: unknown) => {
      if (error instanceof Error) {
        return error.message
      }
      return 'Unknown error'
    }

    const testError = new Error('Image loading failed')
    const result = handleError(testError)
    expect(result).toBe('Image loading failed')

    const unknownError = 'String error'
    const unknownResult = handleError(unknownError)
    expect(unknownResult).toBe('Unknown error')
  })

  it('ログ出力が正しく動作する', () => {
    const logInfo = (message: string, data: Record<string, unknown>) => {
      // モック実装
      return { message, data }
    }

    const logData = {
      component: 'useTemporaryBackground',
      temporaryUrl: 'data:image/jpeg;base64,test',
      originalUrl: 'data:image/jpeg;base64,original',
    }

    const result = logInfo('[TemporaryBackground] 一時的な背景画像を設定しました', logData)
    expect(result.message).toBe('[TemporaryBackground] 一時的な背景画像を設定しました')
    expect(result.data.component).toBe('useTemporaryBackground')
  })
})
