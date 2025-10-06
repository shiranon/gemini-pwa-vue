import { beforeEach, describe, expect, it } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { settingsFormSchema, validateWithZod } from '~/lib/validation'
import type { AppSettings } from '~/types/settings'
import { DEFAULT_SETTINGS } from '~/types/settings'

// 依存関係をモック（Bunのテストランナー対応）
// モックは動的インポート時に適用される

// ストアを動的にインポート
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let useSettingsStore: any

describe('useSettingsStore - messageAppearanceSettings', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())

    // 動的にストアをインポート
    const { useSettingsStore: importedStore } = await import('~/stores/settings')
    useSettingsStore = importedStore
  })

  // ヘルパー関数：現在のストアを取得
  const getStore = () => useSettingsStore()

  describe('messageAppearanceSettings computed property', () => {
    it('デフォルト設定で正しい値を返す', () => {
      const currentStore = getStore()
      const settings = currentStore.messageAppearanceSettings

      expect(settings).toEqual({
        fontFamily: DEFAULT_SETTINGS.fontFamily,
        messageFontSize: DEFAULT_SETTINGS.messageFontSize,
        functionCallFontSize: DEFAULT_SETTINGS.functionCallFontSize,
        thoughtFontSize: DEFAULT_SETTINGS.thoughtFontSize,
        bubbleRadius: DEFAULT_SETTINGS.messageBubbleRadius,
        bubblePaddingX: DEFAULT_SETTINGS.messageBubblePaddingX,
        bubblePaddingY: DEFAULT_SETTINGS.messageBubblePaddingY,
        imageWidthPercent: DEFAULT_SETTINGS.messageImageWidthPercent,
        imageJustify: DEFAULT_SETTINGS.messageImageJustify,
        userBubbleColor: DEFAULT_SETTINGS.userBubbleColor,
        assistantBubbleColor: DEFAULT_SETTINGS.assistantBubbleColor,
        opacity: DEFAULT_SETTINGS.messageOpacity,
      })
    })

    it('設定変更時にリアクティブに更新される', () => {
      // 初期値を確認
      let settings = getStore().messageAppearanceSettings
      expect(settings.messageFontSize).toBe(DEFAULT_SETTINGS.messageFontSize)
      expect(settings.userBubbleColor).toBe(DEFAULT_SETTINGS.userBubbleColor)

      // 設定を変更
      getStore().updateSetting('messageFontSize', 18)
      getStore().updateSetting('userBubbleColor', '#ff0000')

      // 更新された値を確認
      settings = getStore().messageAppearanceSettings
      expect(settings.messageFontSize).toBe(18)
      expect(settings.userBubbleColor).toBe('#ff0000')
    })

    it('フォントファミリー設定が正しく反映される', () => {
      const customFontFamily = 'Arial, sans-serif'
      getStore().updateSetting('fontFamily', customFontFamily)

      const settings = getStore().messageAppearanceSettings
      expect(settings.fontFamily).toBe(customFontFamily)
    })

    it('フォントサイズ設定が正しく反映される', () => {
      getStore().updateSetting('messageFontSize', 20)
      getStore().updateSetting('functionCallFontSize', 16)
      getStore().updateSetting('thoughtFontSize', 14)

      const settings = getStore().messageAppearanceSettings
      expect(settings.messageFontSize).toBe(20)
      expect(settings.functionCallFontSize).toBe(16)
      expect(settings.thoughtFontSize).toBe(14)
    })

    it('バブルスタイル設定が正しく反映される', () => {
      getStore().updateSetting('messageBubbleRadius', 20)
      getStore().updateSetting('messageBubblePaddingX', 24)
      getStore().updateSetting('messageBubblePaddingY', 20)

      const settings = getStore().messageAppearanceSettings
      expect(settings.bubbleRadius).toBe(20)
      expect(settings.bubblePaddingX).toBe(24)
      expect(settings.bubblePaddingY).toBe(20)
    })

    it('画像設定が正しく反映される', () => {
      getStore().updateSetting('messageImageWidthPercent', 80)
      getStore().updateSetting('messageImageJustify', 'center')

      const settings = getStore().messageAppearanceSettings
      expect(settings.imageWidthPercent).toBe(80)
      expect(settings.imageJustify).toBe('center')
    })

    it('バブルカラー設定が正しく反映される', () => {
      const userColor = '#e3f2fd'
      const assistantColor = '#f3e5f5'

      getStore().updateSetting('userBubbleColor', userColor)
      getStore().updateSetting('assistantBubbleColor', assistantColor)

      const settings = getStore().messageAppearanceSettings
      expect(settings.userBubbleColor).toBe(userColor)
      expect(settings.assistantBubbleColor).toBe(assistantColor)
    })

    it('メッセージ透明度設定が正しく反映される', () => {
      getStore().updateSetting('messageOpacity', 0.8)

      const settings = getStore().messageAppearanceSettings
      expect(settings.opacity).toBe(0.8)
    })

    it('複数設定の同時変更が正しく反映される', () => {
      const newSettings: Partial<AppSettings> = {
        fontFamily: 'Georgia, serif',
        messageFontSize: 18,
        functionCallFontSize: 15,
        thoughtFontSize: 13,
        messageBubbleRadius: 12,
        messageBubblePaddingX: 16,
        messageBubblePaddingY: 12,
        messageImageWidthPercent: 90,
        messageImageJustify: 'end',
        userBubbleColor: '#fff3e0',
        assistantBubbleColor: '#f1f8e9',
        messageOpacity: 0.95,
      }

      getStore().updateSettings(newSettings)

      const settings = getStore().messageAppearanceSettings
      expect(settings.fontFamily).toBe('Georgia, serif')
      expect(settings.messageFontSize).toBe(18)
      expect(settings.functionCallFontSize).toBe(15)
      expect(settings.thoughtFontSize).toBe(13)
      expect(settings.bubbleRadius).toBe(12)
      expect(settings.bubblePaddingX).toBe(16)
      expect(settings.bubblePaddingY).toBe(12)
      expect(settings.imageWidthPercent).toBe(90)
      expect(settings.imageJustify).toBe('end')
      expect(settings.userBubbleColor).toBe('#fff3e0')
      expect(settings.assistantBubbleColor).toBe('#f1f8e9')
      expect(settings.opacity).toBe(0.95)
    })

    it('null値の設定が正しく処理される', () => {
      getStore().updateSetting('messageImageWidthPercent', null)

      const settings = getStore().messageAppearanceSettings
      expect(settings.imageWidthPercent).toBe(null)
    })

    it('画像配置の全パターンが正しく処理される', () => {
      const justifyOptions: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end']

      justifyOptions.forEach((justify) => {
        getStore().updateSetting('messageImageJustify', justify)
        const settings = getStore().messageAppearanceSettings
        expect(settings.imageJustify).toBe(justify)
      })
    })

    it('設定リセット時にデフォルト値に戻る', async () => {
      // カスタム設定を適用
      getStore().updateSetting('messageFontSize', 20)
      getStore().updateSetting('userBubbleColor', '#ff0000')

      // リセット
      await getStore().resetToDefaults()

      const settings = getStore().messageAppearanceSettings
      expect(settings.messageFontSize).toBe(DEFAULT_SETTINGS.messageFontSize)
      expect(settings.userBubbleColor).toBe(DEFAULT_SETTINGS.userBubbleColor)
    })

    it('設定インポート時に正しく反映される', () => {
      const importedSettings: Partial<AppSettings> = {
        messageFontSize: 22,
        functionCallFontSize: 18,
        thoughtFontSize: 16,
        messageBubbleRadius: 8,
        userBubbleColor: '#e8f5e8',
        assistantBubbleColor: '#f0f8ff',
      }

      getStore().importSettings(importedSettings)

      const settings = getStore().messageAppearanceSettings
      expect(settings.messageFontSize).toBe(22)
      expect(settings.functionCallFontSize).toBe(18)
      expect(settings.thoughtFontSize).toBe(16)
      expect(settings.bubbleRadius).toBe(8)
      expect(settings.userBubbleColor).toBe('#e8f5e8')
      expect(settings.assistantBubbleColor).toBe('#f0f8ff')
    })

    it('設定エクスポート時に正しい値が含まれる', () => {
      // カスタム設定を適用
      getStore().updateSetting('messageFontSize', 19)
      getStore().updateSetting('messageBubbleRadius', 10)
      getStore().updateSetting('userBubbleColor', '#ffeaa7')

      const exportedSettings = getStore().exportSettings()

      expect(exportedSettings.messageFontSize).toBe(19)
      expect(exportedSettings.messageBubbleRadius).toBe(10)
      expect(exportedSettings.userBubbleColor).toBe('#ffeaa7')
    })
  })

  describe('messageAppearanceSettings の型安全性', () => {
    it('computed propertyの戻り値の型が正しい', () => {
      const settings = getStore().messageAppearanceSettings

      // 型チェック（TypeScriptの型推論をテスト）
      expect(typeof settings.fontFamily).toBe('string')
      expect(typeof settings.messageFontSize).toBe('number')
      expect(typeof settings.functionCallFontSize).toBe('number')
      expect(typeof settings.thoughtFontSize).toBe('number')
      expect(typeof settings.bubbleRadius).toBe('number')
      expect(typeof settings.bubblePaddingX).toBe('number')
      expect(typeof settings.bubblePaddingY).toBe('number')
      expect(typeof settings.imageWidthPercent).toBe('object')
      expect(['start', 'center', 'end']).toContain(settings.imageJustify)
      expect(typeof settings.userBubbleColor).toBe('string')
      expect(typeof settings.assistantBubbleColor).toBe('string')
      expect(typeof settings.opacity).toBe('number')
    })

    it('設定値の範囲が適切である', () => {
      const settings = getStore().messageAppearanceSettings

      expect(settings.messageFontSize).toBeGreaterThan(0)
      expect(settings.functionCallFontSize).toBeGreaterThan(0)
      expect(settings.thoughtFontSize).toBeGreaterThan(0)
      expect(settings.bubbleRadius).toBeGreaterThanOrEqual(0)
      expect(settings.bubblePaddingX).toBeGreaterThanOrEqual(0)
      expect(settings.bubblePaddingY).toBeGreaterThanOrEqual(0)
      expect(settings.opacity).toBeGreaterThan(0)
      expect(settings.opacity).toBeLessThanOrEqual(1)
    })
  })

  describe('messageAppearanceSettings のリアクティビティ', () => {
    it('複数の設定変更が一度に反映される', () => {
      const initialSettings = getStore().messageAppearanceSettings

      // 複数の設定を同時に変更
      getStore().updateSettings({
        messageFontSize: 18,
        functionCallFontSize: 15,
        messageBubbleRadius: 12,
        userBubbleColor: '#ffebee',
      })

      const updatedSettings = getStore().messageAppearanceSettings

      expect(updatedSettings.messageFontSize).toBe(18)
      expect(updatedSettings.functionCallFontSize).toBe(15)
      expect(updatedSettings.bubbleRadius).toBe(12)
      expect(updatedSettings.userBubbleColor).toBe('#ffebee')

      // 他の設定は変更されていないことを確認
      expect(updatedSettings.thoughtFontSize).toBe(initialSettings.thoughtFontSize)
      expect(updatedSettings.bubblePaddingX).toBe(initialSettings.bubblePaddingX)
    })
  })

  describe('messageAppearanceSettings のバリデーション', () => {
    it('messageImageWidthPercentの有効な値が正しく処理される', () => {
      const validValues = [10, 50, 100, null]

      validValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, {
          messageImageWidthPercent: value,
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.messageImageWidthPercent).toBe(value)
        }
      })
    })

    it('messageImageWidthPercentの無効な値が正しく拒否される', () => {
      const invalidValues = [9, 101, -1, 'invalid']

      invalidValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, {
          messageImageWidthPercent: value,
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })
    })

    it('messageImageWidthPercentのundefinedは有効として扱われる（optionalのため）', () => {
      const result = validateWithZod(settingsFormSchema, {
        messageImageWidthPercent: undefined,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.messageImageWidthPercent).toBeUndefined()
      }
    })

    it('フォントサイズの有効な値が正しく処理される', () => {
      const validValues = [
        { messageFontSize: 10 },
        { messageFontSize: 16 },
        { messageFontSize: 36 },
        { functionCallFontSize: 8 },
        { functionCallFontSize: 14 },
        { functionCallFontSize: 28 },
        { thoughtFontSize: 8 },
        { thoughtFontSize: 13 },
        { thoughtFontSize: 28 },
      ]

      validValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, value)
        expect(result.success).toBe(true)
      })
    })

    it('フォントサイズの無効な値が正しく拒否される', () => {
      const invalidValues = [{ messageFontSize: 9 }, { messageFontSize: 37 }, { functionCallFontSize: 7 }, { functionCallFontSize: 29 }, { thoughtFontSize: 7 }, { thoughtFontSize: 29 }]

      invalidValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, value)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })
    })

    it('バブルスタイルの有効な値が正しく処理される', () => {
      const validValues = [
        { messageBubbleRadius: 0 },
        { messageBubbleRadius: 16 },
        { messageBubbleRadius: 40 },
        { messageBubblePaddingX: 4 },
        { messageBubblePaddingX: 20 },
        { messageBubblePaddingX: 48 },
        { messageBubblePaddingY: 4 },
        { messageBubblePaddingY: 16 },
        { messageBubblePaddingY: 48 },
      ]

      validValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, value)
        expect(result.success).toBe(true)
      })
    })

    it('バブルスタイルの無効な値が正しく拒否される', () => {
      const invalidValues = [
        { messageBubbleRadius: -1 },
        { messageBubbleRadius: 41 },
        { messageBubblePaddingX: 3 },
        { messageBubblePaddingX: 49 },
        { messageBubblePaddingY: 3 },
        { messageBubblePaddingY: 49 },
      ]

      invalidValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, value)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })
    })

    it('画像配置の有効な値が正しく処理される', () => {
      const validValues: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end']

      validValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, {
          messageImageJustify: value,
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.messageImageJustify).toBe(value)
        }
      })
    })

    it('画像配置の無効な値が正しく拒否される', () => {
      const invalidValues = ['left', 'right', 'middle', 'invalid', 123]

      invalidValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, {
          messageImageJustify: value,
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })
    })

    it('テーマプリセットの有効な値が正しく処理される', () => {
      const validValues: Array<'default' | 'midnight' | 'forest' | 'rose' | 'noir'> = ['default', 'midnight', 'forest', 'rose', 'noir']

      validValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, {
          themePreset: value,
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.themePreset).toBe(value)
        }
      })
    })

    it('テーマプリセットの無効な値が正しく拒否される', () => {
      const invalidValues = ['custom', 'dark', 'light', 'invalid', 123]

      invalidValues.forEach((value) => {
        const result = validateWithZod(settingsFormSchema, {
          themePreset: value,
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })
    })

    it('複数の設定値の組み合わせが正しくバリデーションされる', () => {
      const validCombination = {
        messageFontSize: 16,
        functionCallFontSize: 14,
        thoughtFontSize: 13,
        messageBubbleRadius: 12,
        messageBubblePaddingX: 20,
        messageBubblePaddingY: 16,
        messageImageWidthPercent: 80,
        messageImageJustify: 'center' as const,
        themePreset: 'default' as const,
      }

      const result = validateWithZod(settingsFormSchema, validCombination)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.messageFontSize).toBe(16)
        expect(result.data.messageImageWidthPercent).toBe(80)
        expect(result.data.messageImageJustify).toBe('center')
        expect(result.data.themePreset).toBe('default')
      }
    })

    it('無効な組み合わせが正しく拒否される', () => {
      const invalidCombination = {
        messageFontSize: 5, // 無効（最小値10未満）
        functionCallFontSize: 50, // 無効（最大値28超過）
        messageBubbleRadius: -5, // 無効（最小値0未満）
        messageImageWidthPercent: 150, // 無効（最大値100超過）
        messageImageJustify: 'invalid', // 無効な値
        themePreset: 'custom', // 無効な値
      }

      const result = validateWithZod(settingsFormSchema, invalidCombination)
      expect(result.success).toBe(false)

      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
        // 複数のエラーが含まれていることを確認
        expect(result.errors.length).toBeGreaterThanOrEqual(4)
      }
    })

    it('ストアの設定更新時にバリデーションが適用される', () => {
      // 有効な値の設定
      getStore().updateSetting('messageImageWidthPercent', 75)
      expect(getStore().settings.messageImageWidthPercent).toBe(75)

      // 無効な値の設定（ストアレベルでは制限されない）
      getStore().updateSetting('messageImageWidthPercent', 150)
      expect(getStore().settings.messageImageWidthPercent).toBe(150)

      // バリデーションスキーマでチェック
      const result = validateWithZod(settingsFormSchema, {
        messageImageWidthPercent: getStore().settings.messageImageWidthPercent,
      })
      expect(result.success).toBe(false)
    })
  })
})
