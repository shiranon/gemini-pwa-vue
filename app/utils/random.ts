/**
 * ランダム数値生成ユーティリティ
 */

/**
 * min以上max以下のランダムな整数を生成
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 0以上max未満のランダムな整数を生成
 */
export function getRandomIndex(max: number): number {
  return Math.floor(Math.random() * max)
}

/**
 * 配列からランダムに1つの要素を選択
 */
export function getRandomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined
  return array[getRandomIndex(array.length)]
}

/**
 * 配列からランダムに複数の要素を選択（重複なし）
 * countが配列長の半分以上の場合、Fisher-Yatesシャッフルを使用してパフォーマンスを向上
 */
export function getRandomElements<T>(array: T[], count: number): T[] {
  if (count <= 0) return []
  if (count >= array.length) return [...array]

  // countが配列長の半分以上の場合、シャッフルしてから切り取る方が効率的
  if (count >= array.length / 2) {
    const shuffled = [...array]

    // Fisher-Yates shuffle (partial)
    for (let i = 0; i < count; i++) {
      const j = i + getRandomIndex(shuffled.length - i)
      ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
    }

    return shuffled.slice(0, count)
  }

  // countが少ない場合は従来の方法（Set使用）
  const result: T[] = []
  const indices = new Set<number>()

  while (result.length < count) {
    const index = getRandomIndex(array.length)
    if (!indices.has(index)) {
      indices.add(index)
      result.push(array[index]!)
    }
  }

  return result
}

/**
 * ランダムな文字列を生成
 */
export function getRandomString(length: number, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  const chars = Array(length)
    .fill(0)
    .map(() => charset.charAt(getRandomIndex(charset.length)))
  return chars.join('')
}
