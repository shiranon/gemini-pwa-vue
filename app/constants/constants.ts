/**
 * アプリケーション共通定数
 */

// 関数ユーティリティの制限値
export const LIMITS = {
  // 最大個数・回数
  MAX_CHOICE_COUNT: 100,
  MAX_STRING_COUNT: 100,
  MAX_INTEGER_COUNT: 100,
  MAX_DICE_COUNT: 100,

  // 最大値
  MAX_STRING_LENGTH: 128,
  MAX_DICE_SIDES: 1000,
  MAX_DICE_MODIFIER: 10000,
} as const

// 画像関連の制限値
export const IMAGE_LIMITS = {
  // 最大ファイルサイズ（5MB）
  MAX_FILE_SIZE: 5 * 1024 * 1024,
} as const

// ランダム文字列の文字セット
export const CHARSETS = {
  UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  LOWERCASE: 'abcdefghijklmnopqrstuvwxyz',
  DIGITS: '0123456789',
  SYMBOLS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const

/**
 * プロファイル名の最大文字数
 */

export const PROFILE_NAME_MAX_LENGTH = 20 as const
