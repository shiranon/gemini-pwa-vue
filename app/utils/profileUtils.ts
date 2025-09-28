import type { SettingsProfile } from '~/types/settings'

/**
 * プロファイル関連のユーティリティ関数
 */

/**
 * プロファイル一覧から指定されたIDのプロファイルを取得
 */
export function findProfileById(profiles: SettingsProfile[], profileId: string | null): SettingsProfile | null {
  if (!profileId) return null
  return profiles.find((profile) => profile.id === profileId) ?? null
}

/**
 * プロファイル一覧からデフォルトプロファイルを取得
 */
export function findDefaultProfile(profiles: SettingsProfile[]): SettingsProfile | null {
  return profiles.find((profile) => profile.isDefault) ?? null
}

/**
 * プロファイル一覧が有効かチェック
 */
export function hasValidProfiles(profiles: SettingsProfile[]): boolean {
  return Array.isArray(profiles) && profiles.length > 0
}

/**
 * プロファイルIDが有効かチェック
 */
export function isValidProfileId(profileId: string | null): boolean {
  return profileId !== null && profileId !== undefined && profileId !== 'null' && profileId !== 'undefined'
}

/**
 * プロファイル一覧から有効なプロファイルIDを取得
 * 指定されたIDが無効な場合、デフォルトプロファイルまたは最初のプロファイルを返す
 */
export function getValidProfileId(profiles: SettingsProfile[], currentProfileId: string | null): string | null {
  if (!hasValidProfiles(profiles)) {
    return null
  }

  // 現在のプロファイルIDが有効な場合
  if (isValidProfileId(currentProfileId)) {
    const exists = profiles.some((profile) => profile.id === currentProfileId)
    if (exists) {
      return currentProfileId
    }
  }

  // デフォルトプロファイルを探す
  const defaultProfile = findDefaultProfile(profiles)
  if (defaultProfile) {
    return defaultProfile.id
  }

  // 最初のプロファイルを返す
  return profiles[0]?.id ?? null
}
