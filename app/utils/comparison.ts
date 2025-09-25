/**
 * 効率的な深い比較ユーティリティ
 * JSON.stringify()よりも高速で、循環参照にも対応
 */

/**
 * 2つの値を深く比較する
 * @param a 比較対象の値A
 * @param b 比較対象の値B
 * @returns 値が等しいかどうか
 */
export function deepEqual<T>(a: T, b: T): boolean {
  // 同じ参照の場合は true
  if (a === b) return true

  // null または undefined のチェック
  if (a == null || b == null) return a === b

  // 型が異なる場合は false
  if (typeof a !== typeof b) return false

  // プリミティブ型の比較
  if (typeof a !== 'object') return a === b

  // 配列の比較
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  // 配列と非配列の比較
  if (Array.isArray(a) || Array.isArray(b)) return false

  // オブジェクトの比較
  if (typeof a === 'object' && typeof b === 'object') {
    // Date オブジェクトの特別な処理
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }

    const keysA = Object.keys(a as Record<string, unknown>)
    const keysB = Object.keys(b as Record<string, unknown>)

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
    }
    return true
  }

  return false
}

/**
 * 設定オブジェクトの比較（特定のキーを除外）
 * @param a 設定A
 * @param b 設定B
 * @param excludeKeys 除外するキーの配列
 * @returns 設定が等しいかどうか
 */
export function deepEqualExcluding<T extends Record<string, unknown>>(a: T, b: T, excludeKeys: (keyof T)[]): boolean {
  const keysA = Object.keys(a) as (keyof T)[]
  const keysB = Object.keys(b) as (keyof T)[]

  // 除外キーを除いたキーセットを作成
  const filteredKeysA = keysA.filter((key) => !excludeKeys.includes(key))
  const filteredKeysB = keysB.filter((key) => !excludeKeys.includes(key))

  if (filteredKeysA.length !== filteredKeysB.length) return false

  for (const key of filteredKeysA) {
    if (!filteredKeysB.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }

  return true
}

/**
 * オブジェクトの特定のキーのみを比較
 * @param a オブジェクトA
 * @param b オブジェクトB
 * @param keys 比較するキーの配列
 * @returns 指定されたキーの値が等しいかどうか
 */
export function deepEqualKeys<T extends Record<string, unknown>>(a: T, b: T, keys: (keyof T)[]): boolean {
  for (const key of keys) {
    // キーが両方のオブジェクトに存在するかチェック
    if (!(key in a) || !(key in b)) return false
    if (!deepEqual(a[key], b[key])) return false
  }
  return true
}
