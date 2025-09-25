/**
 * バリデーションユーティリティ
 */

/**
 * 整数かどうかをチェック
 */
export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

/**
 * 正の整数かどうかをチェック
 */
export function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0
}

/**
 * 指定範囲内の整数かどうかをチェック
 */
export function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return isInteger(value) && value >= min && value <= max
}

/**
 * 空でない文字列かどうかをチェック
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 空でない配列かどうかをチェック
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0
}
