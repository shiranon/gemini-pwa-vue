import type { AppSettings } from '~/types/settings'
import { DEFAULT_SETTINGS } from '~/types/settings'

/**
 * 設定が等しいかどうかを判断する
 * @param a 設定 after
 * @param b 設定 before
 * @returns 設定が等しいかどうか
 */
export function areSettingsEqual(a: AppSettings, b: AppSettings): boolean {
  const keys = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]

  for (const key of keys) {
    if (key === 'backgroundImageBlob') continue

    const av = a[key]
    const bv = b[key]

    if (typeof av === 'object' && av !== null && typeof bv === 'object' && bv !== null) {
      try {
        if (JSON.stringify(av) !== JSON.stringify(bv)) return false
      } catch {
        if (av !== bv) return false
      }
    } else if (av !== bv) {
      return false
    }
  }
  return true
}
