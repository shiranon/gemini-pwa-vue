import { describe, expect, it } from 'bun:test'
import { getRandomElement, getRandomElements, getRandomIndex, getRandomInt, getRandomString } from '~/utils/random'

describe('random utilities', () => {
  describe('getRandomInt', () => {
    it('指定した範囲の整数を生成する', () => {
      for (let i = 0; i < 100; i++) {
        const result = getRandomInt(1, 10)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(10)
        expect(Number.isInteger(result)).toBe(true)
      }
    })

    it('単一の値の範囲で正しく動作する', () => {
      for (let i = 0; i < 10; i++) {
        expect(getRandomInt(5, 5)).toBe(5)
      }
    })

    it('負の数を含む範囲で正しく動作する', () => {
      for (let i = 0; i < 100; i++) {
        const result = getRandomInt(-10, -1)
        expect(result).toBeGreaterThanOrEqual(-10)
        expect(result).toBeLessThanOrEqual(-1)
        expect(Number.isInteger(result)).toBe(true)
      }
    })

    it('ゼロを含む範囲で正しく動作する', () => {
      for (let i = 0; i < 100; i++) {
        const result = getRandomInt(-5, 5)
        expect(result).toBeGreaterThanOrEqual(-5)
        expect(result).toBeLessThanOrEqual(5)
        expect(Number.isInteger(result)).toBe(true)
      }
    })

    it('統計的に均等な分布を持つ', () => {
      const counts = new Map<number, number>()
      const iterations = 10000
      const min = 1
      const max = 10

      // 統計データを収集
      for (let i = 0; i < iterations; i++) {
        const result = getRandomInt(min, max)
        counts.set(result, (counts.get(result) || 0) + 1)
      }

      // 各値が期待される頻度の範囲内にあることを確認
      const expectedFreq = iterations / (max - min + 1)
      const tolerance = expectedFreq * 0.2 // 20%の許容誤差

      for (let value = min; value <= max; value++) {
        const count = counts.get(value) || 0
        expect(count).toBeGreaterThan(expectedFreq - tolerance)
        expect(count).toBeLessThan(expectedFreq + tolerance)
      }
    })
  })

  describe('getRandomIndex', () => {
    it('0以上max未満の整数を生成する', () => {
      for (let i = 0; i < 100; i++) {
        const result = getRandomIndex(10)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(10)
        expect(Number.isInteger(result)).toBe(true)
      }
    })

    it('max=1の場合は0のみを返す', () => {
      for (let i = 0; i < 10; i++) {
        expect(getRandomIndex(1)).toBe(0)
      }
    })

    it('統計的に均等な分布を持つ', () => {
      const counts = new Map<number, number>()
      const iterations = 10000
      const max = 5

      // 統計データを収集
      for (let i = 0; i < iterations; i++) {
        const result = getRandomIndex(max)
        counts.set(result, (counts.get(result) || 0) + 1)
      }

      // 各値が期待される頻度の範囲内にあることを確認
      const expectedFreq = iterations / max
      const tolerance = expectedFreq * 0.2 // 20%の許容誤差

      for (let value = 0; value < max; value++) {
        const count = counts.get(value) || 0
        expect(count).toBeGreaterThan(expectedFreq - tolerance)
        expect(count).toBeLessThan(expectedFreq + tolerance)
      }
    })
  })

  describe('getRandomElement', () => {
    it('配列からランダムに要素を選択する', () => {
      const array = ['a', 'b', 'c', 'd', 'e']

      for (let i = 0; i < 50; i++) {
        const result = getRandomElement(array)
        expect(array).toContain(result as string)
      }
    })

    it('単一要素の配列から正しく選択する', () => {
      const array = ['only']

      for (let i = 0; i < 10; i++) {
        expect(getRandomElement(array)).toBe('only')
      }
    })

    it('空配列に対してundefinedを返す', () => {
      expect(getRandomElement([])).toBeUndefined()
    })

    it('様々な型の要素を正しく選択する', () => {
      const array = [1, 'string', true, null, undefined, { key: 'value' }]

      for (let i = 0; i < 50; i++) {
        const result = getRandomElement(array)
        expect(array).toContain(result as string)
      }
    })

    it('統計的に均等な分布を持つ', () => {
      const array = ['a', 'b', 'c', 'd', 'e']
      const counts = new Map<string, number>()
      const iterations = 10000

      // 統計データを収集
      for (let i = 0; i < iterations; i++) {
        const result = getRandomElement(array)
        if (result !== undefined) {
          counts.set(result, (counts.get(result) || 0) + 1)
        }
      }

      // 各要素が期待される頻度の範囲内にあることを確認
      const expectedFreq = iterations / array.length
      const tolerance = expectedFreq * 0.2 // 20%の許容誤差

      for (const element of array) {
        const count = counts.get(element) || 0
        expect(count).toBeGreaterThan(expectedFreq - tolerance)
        expect(count).toBeLessThan(expectedFreq + tolerance)
      }
    })
  })

  describe('getRandomElements', () => {
    it('指定した個数の要素をランダムに選択する', () => {
      const array = ['a', 'b', 'c', 'd', 'e']
      const result = getRandomElements(array, 3)

      expect(result).toHaveLength(3)
      for (const element of result) {
        expect(array).toContain(element)
      }

      // 重複がないことを確認
      expect(new Set(result).size).toBe(3)
    })

    it('配列の長さ以上を要求した場合、全要素を返す', () => {
      const array = ['a', 'b', 'c']
      const result = getRandomElements(array, 5)

      expect(result).toHaveLength(3)
      expect(result.sort()).toEqual(['a', 'b', 'c'])
    })

    it('0個を要求した場合、空配列を返す', () => {
      const array = ['a', 'b', 'c']
      const result = getRandomElements(array, 0)

      expect(result).toHaveLength(0)
      expect(result).toEqual([])
    })

    it('単一要素の配列から1個選択できる', () => {
      const array = ['only']
      const result = getRandomElements(array, 1)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('only')
    })

    it('空配列に対して空配列を返す', () => {
      const result = getRandomElements([], 3)
      expect(result).toHaveLength(0)
      expect(result).toEqual([])
    })

    it('重複なしで選択される', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      for (let i = 0; i < 50; i++) {
        const result = getRandomElements(array, 5)
        expect(new Set(result).size).toBe(5) // 重複なし

        for (const element of result) {
          expect(array).toContain(element)
        }
      }
    })

    it('大きな配列で効率的に動作する', () => {
      const array = Array.from({ length: 1000 }, (_, i) => i)
      const result = getRandomElements(array, 100)

      expect(result).toHaveLength(100)
      expect(new Set(result).size).toBe(100) // 重複なし

      for (const element of result) {
        expect(array).toContain(element)
      }
    })

    it('統計的にランダムな選択を行う', () => {
      const array = ['a', 'b', 'c', 'd', 'e', 'f']
      const counts = new Map<string, number>()
      const iterations = 5000

      // 統計データを収集（毎回3個選択）
      for (let i = 0; i < iterations; i++) {
        const result = getRandomElements(array, 3)
        for (const element of result) {
          counts.set(element, (counts.get(element) || 0) + 1)
        }
      }

      // 各要素が期待される頻度の範囲内にあることを確認
      // 6個中3個選ぶので、各要素が選ばれる確率は3/6 = 0.5
      const expectedFreq = iterations * 0.5
      const tolerance = expectedFreq * 0.15 // 15%の許容誤差

      for (const element of array) {
        const count = counts.get(element) || 0
        expect(count).toBeGreaterThan(expectedFreq - tolerance)
        expect(count).toBeLessThan(expectedFreq + tolerance)
      }
    })
  })

  describe('getRandomString', () => {
    it('指定した長さの文字列を生成する', () => {
      for (const length of [1, 5, 10, 20, 100]) {
        const result = getRandomString(length)
        expect(result).toHaveLength(length)
      }
    })

    it('0文字の文字列を生成できる', () => {
      expect(getRandomString(0)).toBe('')
    })

    it('指定した文字セットから文字を選択する', () => {
      const charset = 'ABC'
      const result = getRandomString(100, charset)

      for (const char of result) {
        expect(charset).toContain(char)
      }
    })

    it('単一文字の文字セットで正しく動作する', () => {
      const charset = 'X'
      const result = getRandomString(10, charset)

      expect(result).toBe('XXXXXXXXXX')
    })

    it('デフォルトの文字セットに英数字が含まれる', () => {
      const result = getRandomString(1000)

      // 1000文字生成すれば、大文字・小文字・数字が含まれるはず
      expect(result).toMatch(/[A-Z]/)
      expect(result).toMatch(/[a-z]/)
      expect(result).toMatch(/\d/)
    })

    it('統計的に均等な文字分布を持つ', () => {
      const charset = 'ABCDE'
      const counts = new Map<string, number>()
      const totalChars = 50000

      const result = getRandomString(totalChars, charset)

      // 統計データを収集
      for (const char of result) {
        counts.set(char, (counts.get(char) || 0) + 1)
      }

      // 各文字が期待される頻度の範囲内にあることを確認
      const expectedFreq = totalChars / charset.length
      const tolerance = expectedFreq * 0.1 // 10%の許容誤差

      for (const char of charset) {
        const count = counts.get(char) || 0
        expect(count).toBeGreaterThan(expectedFreq - tolerance)
        expect(count).toBeLessThan(expectedFreq + tolerance)
      }
    })

    it('複数回実行して異なる結果を生成する', () => {
      const results = new Set<string>()

      for (let i = 0; i < 100; i++) {
        results.add(getRandomString(20))
      }

      // 20文字のランダム文字列を100回生成すれば、ほぼ全て異なるはず
      expect(results.size).toBeGreaterThan(95)
    })

    it('特殊文字を含む文字セットで正しく動作する', () => {
      const charset = '!@#$%^&*()'
      const result = getRandomString(50, charset)

      for (const char of result) {
        expect(charset).toContain(char)
      }
    })

    it('Unicode文字を含む文字セットで正しく動作する', () => {
      const charset = 'あいうえお'
      const result = getRandomString(20, charset)

      expect(result).toHaveLength(20)
      for (const char of result) {
        expect(charset).toContain(char)
      }
    })
  })

  describe('エッジケース', () => {
    it('Math.random() が0を返す場合も正しく動作する', () => {
      // Math.random() は [0, 1) の範囲なので、0は含まれる
      expect(() => getRandomInt(1, 10)).not.toThrow()
      expect(() => getRandomIndex(10)).not.toThrow()
      expect(() => getRandomElement([1, 2, 3])).not.toThrow()
      expect(() => getRandomElements([1, 2, 3], 2)).not.toThrow()
      expect(() => getRandomString(10)).not.toThrow()
    })

    it('大きな数値範囲で正しく動作する', () => {
      const result = getRandomInt(1000000, 2000000)
      expect(result).toBeGreaterThanOrEqual(1000000)
      expect(result).toBeLessThanOrEqual(2000000)
      expect(Number.isInteger(result)).toBe(true)
    })

    it('負の大きな数値範囲で正しく動作する', () => {
      const result = getRandomInt(-2000000, -1000000)
      expect(result).toBeGreaterThanOrEqual(-2000000)
      expect(result).toBeLessThanOrEqual(-1000000)
      expect(Number.isInteger(result)).toBe(true)
    })
  })
})
