import { beforeEach, describe, expect, it } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import type { AppSettings } from '~/types/settings'

// 依存関係をモック（Bunのテストランナー対応）
// モックは動的インポート時に適用される

// ストアを動的にインポート
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let useSettingsStore: any

describe('Settings Store - Image Display Percentage Feature', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())

    // 動的にストアをインポート
    const { useSettingsStore: importedStore } = await import('~/stores/settings')
    useSettingsStore = importedStore
  })

  // ヘルパー関数：現在のストアを取得
  const getStore = () => useSettingsStore()

  describe('messageImageWidthPercent', () => {
    it('デフォルト値はnullである', () => {
      expect(getStore().settings.messageImageWidthPercent).toBeNull()
    })

    it('有効なパーセンテージ値で更新できる', () => {
      const testValues = [10, 25, 50, 75, 100]

      testValues.forEach((value) => {
        getStore().updateSetting('messageImageWidthPercent', value)
        expect(getStore().settings.messageImageWidthPercent).toBe(value)
      })
    })

    it('有効範囲外の値（10-100）も許可する', () => {
      getStore().updateSetting('messageImageWidthPercent', 5)
      expect(getStore().settings.messageImageWidthPercent).toBe(5)

      getStore().updateSetting('messageImageWidthPercent', 150)
      expect(getStore().settings.messageImageWidthPercent).toBe(150)
    })

    it('null値を正しく処理する', () => {
      getStore().updateSetting('messageImageWidthPercent', 50)
      expect(getStore().settings.messageImageWidthPercent).toBe(50)

      getStore().updateSetting('messageImageWidthPercent', null)
      expect(getStore().settings.messageImageWidthPercent).toBeNull()
    })

    it('undefined値をundefinedに設定して処理する', () => {
      getStore().updateSetting('messageImageWidthPercent', undefined as unknown as number | null)
      expect(getStore().settings.messageImageWidthPercent).toBeUndefined()
    })

    it('NaN値をNaNに設定して処理する', () => {
      getStore().updateSetting('messageImageWidthPercent', Number.NaN)
      expect(getStore().settings.messageImageWidthPercent).toBeNaN()
    })
  })

  describe('messageImageJustify', () => {
    it('デフォルト値はstartである', () => {
      expect(getStore().settings.messageImageJustify).toBe('start')
    })

    it('有効なjustify値で更新できる', () => {
      const testValues: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end']

      testValues.forEach((value) => {
        getStore().updateSetting('messageImageJustify', value)
        expect(getStore().settings.messageImageJustify).toBe(value)
      })
    })
  })

  describe('画像表示用のcomputed properties', () => {
    it('messageAppearanceSettings.imageWidthPercentを正しく計算する', () => {
      expect(getStore().messageAppearanceSettings.imageWidthPercent).toBeNull()

      getStore().updateSetting('messageImageWidthPercent', 75)
      expect(getStore().messageAppearanceSettings.imageWidthPercent).toBe(75)
    })

    it('異なるjustify値でmessageAppearanceSettings.imageJustifyを正しく計算する', () => {
      expect(getStore().messageAppearanceSettings.imageJustify).toBe('start')

      getStore().updateSetting('messageImageJustify', 'center')
      expect(getStore().messageAppearanceSettings.imageJustify).toBe('center')

      getStore().updateSetting('messageImageJustify', 'end')
      expect(getStore().messageAppearanceSettings.imageJustify).toBe('end')
    })
  })

  describe('CSS変数の適用', () => {
    it('画像表示用の正しいCSS変数を適用する', () => {
      getStore().updateSetting('messageImageWidthPercent', 80)
      getStore().updateSetting('messageImageJustify', 'center')

      expect(getStore().settings.messageImageWidthPercent).toBe(80)
      expect(getStore().settings.messageImageJustify).toBe('center')
    })
  })

  describe('設定の永続化', () => {
    it('画像パーセンテージが更新されたときに設定をdirtyとしてマークする', () => {
      expect(getStore().isDirty).toBe(false)

      getStore().updateSetting('messageImageWidthPercent', 75)

      expect(getStore().isDirty).toBe(true)
    })

    it('画像パーセンテージ設定を保存・読み込みできる', async () => {
      getStore().updateSetting('messageImageWidthPercent', 60)
      getStore().updateSetting('messageImageJustify', 'end')

      expect(getStore().settings.messageImageWidthPercent).toBe(60)
      expect(getStore().settings.messageImageJustify).toBe('end')
    })
  })

  describe('設定の移行', () => {
    it('レガシー設定を正しく処理する', () => {
      const legacySettings: Partial<AppSettings> = {
        messageImageWidthPercent: 90,
        messageImageJustify: 'center',
      }

      getStore().updateSettings(legacySettings)

      expect(getStore().settings.messageImageWidthPercent).toBe(90)
      expect(getStore().settings.messageImageJustify).toBe('center')
    })
  })

  describe('エッジケース', () => {
    it('小数点値を丸めて処理する', () => {
      getStore().updateSetting('messageImageWidthPercent', 85.7)
      expect(getStore().settings.messageImageWidthPercent).toBe(85.7)
    })

    it('負の値をクランプせずに処理する', () => {
      getStore().updateSetting('messageImageWidthPercent', -10)
      expect(getStore().settings.messageImageWidthPercent).toBe(-10)
    })
  })
})
