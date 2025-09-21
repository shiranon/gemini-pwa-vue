export interface FontPreset {
  label: string
  value: string
  stack: string
  webFont?: {
    family: string
    weight: string
    url?: string
  }
}

export interface FontSettings {
  mode: 'preset' | 'system' | 'upload'
  currentStack: string
  systemFontName: string
  uploadedFont: {
    name: string
    dataUrl: string
  } | null
  selectedPreset: string
}

export const useFontSettings = () => {
  const fontPresets: FontPreset[] = [
    {
      label: '標準（システムUI）',
      value: 'system',
      stack: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    {
      label: 'Noto Sans JP',
      value: 'noto-sans-jp',
      stack: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif',
      webFont: {
        family: 'Noto Sans JP',
        weight: '400',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap',
      },
    },
    {
      label: 'Noto Serif JP（明朝）',
      value: 'noto-serif-jp',
      stack: '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif',
      webFont: {
        family: 'Noto Serif JP',
        weight: '400',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600&display=swap',
      },
    },
    {
      label: 'M PLUS 1p',
      value: 'm-plus-1p',
      stack: '"M PLUS 1p", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif',
      webFont: {
        family: 'M PLUS 1p',
        weight: '400',
        url: 'https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@400;500;700&display=swap',
      },
    },
    {
      label: 'BIZ UDPGothic',
      value: 'biz-udpgothic',
      stack: '"BIZ UDPGothic", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif',
      webFont: {
        family: 'BIZ UDPGothic',
        weight: '400',
        url: 'https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap',
      },
    },
  ]

  // Google Fonts の動的ロード
  const loadWebFont = async (preset: FontPreset) => {
    if (!preset.webFont) return

    const existingLink = document.querySelector(`link[href="${preset.webFont.url}"]`)
    if (existingLink) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = preset.webFont.url!
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)

    return new Promise((resolve, reject) => {
      link.onload = resolve
      link.onerror = reject
    })
  }

  // システムフォントの存在チェック
  const checkSystemFont = (fontName: string): boolean => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return false

    context.font = '12px monospace'
    const fallbackWidth = context.measureText('abcdefghijklmnopqrstuvwxyz0123456789').width

    context.font = `12px "${fontName}", monospace`
    const fontWidth = context.measureText('abcdefghijklmnopqrstuvwxyz0123456789').width

    return fontWidth !== fallbackWidth
  }

  // ページにフォントを適用
  const applyFontToPage = (fontStack: string) => {
    if (import.meta.client) {
      document.documentElement.style.setProperty('--message-font-family', fontStack)
    }
  }

  // プリセットフォントを適用
  const applyPreset = async (presetValue: string) => {
    const preset = fontPresets.find((p) => p.value === presetValue)
    if (!preset) return null

    // WebFontの場合は動的ロード
    if (preset.webFont) {
      try {
        await loadWebFont(preset)
      } catch (error) {
        logger.warn('Webフォントの読み込みに失敗:', { component: 'useFontSettings' }, error)
      }
    }

    applyFontToPage(preset.stack)
    return preset.stack
  }

  // システムフォントを適用
  const applySystemFont = (fontName: string) => {
    if (!fontName.trim()) return null

    const exists = checkSystemFont(fontName)
    if (!exists) {
      logger.warn(`フォント「${fontName}」がシステムに見つかりません`, { component: 'useFontSettings' })
    }

    const fontStack = `"${fontName}", ${fontPresets[0]?.stack || 'system-ui, sans-serif'}`
    applyFontToPage(fontStack)
    return fontStack
  }

  // アップロードフォントを適用
  const applyUploadedFont = (file: File) => {
    return new Promise<{ fontStack: string; fontData: { name: string; dataUrl: string } }>((resolve, reject) => {
      // ファイル形式チェック
      const supportedFormats = ['.woff2', '.woff', '.ttf', '.otf']
      const isSupported = supportedFormats.some((format) => file.name.toLowerCase().endsWith(format))

      if (!isSupported) {
        reject(new Error('対応形式: .woff2, .woff, .ttf, .otf'))
        return
      }

      const fontFamily = file.name.replace(/\.(woff2|woff|ttf|otf)$/i, '')

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('フォントの読み込みに失敗しました'))
          return
        }

        // @font-face を動的に追加
        const style = document.createElement('style')
        const format = file.name.endsWith('.woff2') ? 'woff2' : file.name.endsWith('.woff') ? 'woff' : file.name.endsWith('.otf') ? 'opentype' : 'truetype'

        style.textContent = `
          @font-face {
            font-family: "${fontFamily}";
            src: url("${result}") format("${format}");
            font-display: swap;
          }
        `
        document.head.appendChild(style)

        const fontStack = `"${fontFamily}", ${fontPresets[0]?.stack || 'system-ui, sans-serif'}`
        const fontData = {
          name: fontFamily,
          dataUrl: result,
        }

        applyFontToPage(fontStack)
        resolve({ fontStack, fontData })
      }
      reader.onerror = () => reject(new Error('フォントの読み込みに失敗しました'))
      reader.readAsDataURL(file)
    })
  }

  return {
    fontPresets,
    loadWebFont,
    checkSystemFont,
    applyFontToPage,
    applyPreset,
    applySystemFont,
    applyUploadedFont,
  }
}
