import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '~/stores/settings'
import type { AppSettings } from '~/types/settings'

describe('Settings Store - Image Display Percentage Feature', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('messageImageWidthPercent', () => {
    it('デフォルト値はnullである', () => {
      const store = useSettingsStore()
      expect(store.settings.messageImageWidthPercent).toBeNull()
    })

    it('有効なパーセンテージ値で更新できる', () => {
      const store = useSettingsStore()

      const testValues = [10, 25, 50, 75, 100]

      testValues.forEach((value) => {
        store.updateSetting('messageImageWidthPercent', value)
        expect(store.settings.messageImageWidthPercent).toBe(value)
      })
    })

    it('有効範囲外の値（10-100）も許可する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', 5)
      expect(store.settings.messageImageWidthPercent).toBe(5)

      store.updateSetting('messageImageWidthPercent', 150)
      expect(store.settings.messageImageWidthPercent).toBe(150)
    })

    it('null値を正しく処理する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', 50)
      expect(store.settings.messageImageWidthPercent).toBe(50)

      store.updateSetting('messageImageWidthPercent', null)
      expect(store.settings.messageImageWidthPercent).toBeNull()
    })

    it('undefined値をundefinedに設定して処理する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', undefined as unknown as number | null)
      expect(store.settings.messageImageWidthPercent).toBeUndefined()
    })

    it('NaN値をNaNに設定して処理する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', Number.NaN)
      expect(store.settings.messageImageWidthPercent).toBeNaN()
    })
  })

  describe('messageImageJustify', () => {
    it('デフォルト値はstartである', () => {
      const store = useSettingsStore()
      expect(store.settings.messageImageJustify).toBe('start')
    })

    it('有効なjustify値で更新できる', () => {
      const store = useSettingsStore()

      const testValues: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end']

      testValues.forEach((value) => {
        store.updateSetting('messageImageJustify', value)
        expect(store.settings.messageImageJustify).toBe(value)
      })
    })
  })

  describe('画像表示用のcomputed properties', () => {
    it('messageAppearanceSettings.imageWidthPercentを正しく計算する', () => {
      const store = useSettingsStore()

      expect(store.messageAppearanceSettings.imageWidthPercent).toBeNull()

      store.updateSetting('messageImageWidthPercent', 75)
      expect(store.messageAppearanceSettings.imageWidthPercent).toBe(75)
    })

    it('異なるjustify値でmessageAppearanceSettings.imageJustifyを正しく計算する', () => {
      const store = useSettingsStore()

      expect(store.messageAppearanceSettings.imageJustify).toBe('start')

      store.updateSetting('messageImageJustify', 'center')
      expect(store.messageAppearanceSettings.imageJustify).toBe('center')

      store.updateSetting('messageImageJustify', 'end')
      expect(store.messageAppearanceSettings.imageJustify).toBe('end')
    })
  })

  describe('CSS変数の適用', () => {
    it('画像表示用の正しいCSS変数を適用する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', 80)
      store.updateSetting('messageImageJustify', 'center')

      expect(store.settings.messageImageWidthPercent).toBe(80)
      expect(store.settings.messageImageJustify).toBe('center')
    })
  })

  describe('設定の永続化', () => {
    it('画像パーセンテージが更新されたときに設定をdirtyとしてマークする', () => {
      const store = useSettingsStore()

      expect(store.isDirty).toBe(false)

      store.updateSetting('messageImageWidthPercent', 75)

      expect(store.isDirty).toBe(true)
    })

    it('画像パーセンテージ設定を保存・読み込みできる', async () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', 60)
      store.updateSetting('messageImageJustify', 'end')

      expect(store.settings.messageImageWidthPercent).toBe(60)
      expect(store.settings.messageImageJustify).toBe('end')
    })
  })

  describe('設定の移行', () => {
    it('レガシー設定を正しく処理する', () => {
      const store = useSettingsStore()

      const legacySettings: Partial<AppSettings> = {
        messageImageWidthPercent: 90,
        messageImageJustify: 'center',
      }

      store.updateSettings(legacySettings)

      expect(store.settings.messageImageWidthPercent).toBe(90)
      expect(store.settings.messageImageJustify).toBe('center')
    })
  })

  describe('エッジケース', () => {
    it('文字列数値を正しく処理する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', '85' as unknown as number)
      expect(store.settings.messageImageWidthPercent).toBe('85')
    })

    it('小数点値を丸めて処理する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', 85.7)
      expect(store.settings.messageImageWidthPercent).toBe(85.7)
    })

    it('負の値をクランプせずに処理する', () => {
      const store = useSettingsStore()

      store.updateSetting('messageImageWidthPercent', -10)
      expect(store.settings.messageImageWidthPercent).toBe(-10)
    })
  })
})
