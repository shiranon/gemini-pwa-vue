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
 */
export function getRandomElements<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array]

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
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(getRandomIndex(charset.length))
  }
  return result
}
