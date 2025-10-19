import { describe, expect, it } from 'bun:test'
import { isInteger, isIntegerInRange, isNonEmptyArray, isNonEmptyString, isPositiveInteger } from '~/utils/validation'

describe('validation utilities', () => {
  describe('isInteger', () => {
    it('正の整数を判定できる', () => {
      expect(isInteger(1)).toBe(true)
      expect(isInteger(42)).toBe(true)
      expect(isInteger(100)).toBe(true)
    })

    it('負の整数を判定できる', () => {
      expect(isInteger(-1)).toBe(true)
      expect(isInteger(-42)).toBe(true)
      expect(isInteger(-100)).toBe(true)
    })

    it('ゼロを整数として判定する', () => {
      expect(isInteger(0)).toBe(true)
    })

    it('小数を整数でないと判定する', () => {
      expect(isInteger(1.5)).toBe(false)
      expect(isInteger(-1.5)).toBe(false)
      expect(isInteger(0.1)).toBe(false)
      expect(isInteger(3.14159)).toBe(false)
    })

    it('Infinity を整数でないと判定する', () => {
      expect(isInteger(Infinity)).toBe(false)
      expect(isInteger(-Infinity)).toBe(false)
    })

    it('NaN を整数でないと判定する', () => {
      expect(isInteger(Number.NaN)).toBe(false)
    })

    it('数値以外の型を整数でないと判定する', () => {
      expect(isInteger('42')).toBe(false)
      expect(isInteger('1.5')).toBe(false)
      expect(isInteger(true)).toBe(false)
      expect(isInteger(false)).toBe(false)
      expect(isInteger(null)).toBe(false)
      expect(isInteger(undefined)).toBe(false)
      expect(isInteger([])).toBe(false)
      expect(isInteger({})).toBe(false)
      expect(isInteger(() => {})).toBe(false)
    })

    it('大きな整数を正しく判定する', () => {
      expect(isInteger(Number.MAX_SAFE_INTEGER)).toBe(true)
      expect(isInteger(Number.MIN_SAFE_INTEGER)).toBe(true)
      expect(isInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(true) // 精度の問題はあるが整数として判定
    })
  })

  describe('isPositiveInteger', () => {
    it('正の整数を判定できる', () => {
      expect(isPositiveInteger(1)).toBe(true)
      expect(isPositiveInteger(42)).toBe(true)
      expect(isPositiveInteger(100)).toBe(true)
      expect(isPositiveInteger(Number.MAX_SAFE_INTEGER)).toBe(true)
    })

    it('ゼロを正の整数でないと判定する', () => {
      expect(isPositiveInteger(0)).toBe(false)
    })

    it('負の整数を正の整数でないと判定する', () => {
      expect(isPositiveInteger(-1)).toBe(false)
      expect(isPositiveInteger(-42)).toBe(false)
      expect(isPositiveInteger(Number.MIN_SAFE_INTEGER)).toBe(false)
    })

    it('小数を正の整数でないと判定する', () => {
      expect(isPositiveInteger(1.5)).toBe(false)
      expect(isPositiveInteger(-1.5)).toBe(false)
      expect(isPositiveInteger(0.1)).toBe(false)
    })

    it('特殊値を正の整数でないと判定する', () => {
      expect(isPositiveInteger(Infinity)).toBe(false)
      expect(isPositiveInteger(-Infinity)).toBe(false)
      expect(isPositiveInteger(Number.NaN)).toBe(false)
    })

    it('数値以外の型を正の整数でないと判定する', () => {
      expect(isPositiveInteger('1')).toBe(false)
      expect(isPositiveInteger(true)).toBe(false)
      expect(isPositiveInteger(null)).toBe(false)
      expect(isPositiveInteger(undefined)).toBe(false)
      expect(isPositiveInteger([])).toBe(false)
      expect(isPositiveInteger({})).toBe(false)
    })
  })

  describe('isIntegerInRange', () => {
    it('範囲内の整数を判定できる', () => {
      expect(isIntegerInRange(5, 1, 10)).toBe(true)
      expect(isIntegerInRange(1, 1, 10)).toBe(true) // 下限値
      expect(isIntegerInRange(10, 1, 10)).toBe(true) // 上限値
      expect(isIntegerInRange(0, -5, 5)).toBe(true)
      expect(isIntegerInRange(-3, -5, 5)).toBe(true)
    })

    it('範囲外の整数を判定できる', () => {
      expect(isIntegerInRange(0, 1, 10)).toBe(false) // 下限値未満
      expect(isIntegerInRange(11, 1, 10)).toBe(false) // 上限値超過
      expect(isIntegerInRange(-6, -5, 5)).toBe(false) // 下限値未満
      expect(isIntegerInRange(6, -5, 5)).toBe(false) // 上限値超過
    })

    it('小数を範囲内でも整数でないと判定する', () => {
      expect(isIntegerInRange(5.5, 1, 10)).toBe(false)
      expect(isIntegerInRange(1.1, 1, 10)).toBe(false)
      expect(isIntegerInRange(9.9, 1, 10)).toBe(false)
    })

    it('特殊値を範囲外と判定する', () => {
      expect(isIntegerInRange(Infinity, 1, 10)).toBe(false)
      expect(isIntegerInRange(-Infinity, 1, 10)).toBe(false)
      expect(isIntegerInRange(Number.NaN, 1, 10)).toBe(false)
    })

    it('数値以外の型を範囲外と判定する', () => {
      expect(isIntegerInRange('5', 1, 10)).toBe(false)
      expect(isIntegerInRange(true, 0, 1)).toBe(false)
      expect(isIntegerInRange(null, -1, 1)).toBe(false)
      expect(isIntegerInRange(undefined, 1, 10)).toBe(false)
    })

    it('範囲が逆転している場合も正しく動作する', () => {
      expect(isIntegerInRange(5, 10, 1)).toBe(false) // 5は1-10の範囲外（min > max）
      expect(isIntegerInRange(5, 5, 5)).toBe(true) // min = max = value
    })

    it('負の範囲で正しく動作する', () => {
      expect(isIntegerInRange(-5, -10, -1)).toBe(true)
      expect(isIntegerInRange(-15, -10, -1)).toBe(false)
      expect(isIntegerInRange(0, -10, -1)).toBe(false)
    })
  })

  describe('isNonEmptyString', () => {
    it('空でない文字列を判定できる', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString('world')).toBe(true)
      expect(isNonEmptyString('a')).toBe(true)
      expect(isNonEmptyString('1')).toBe(true)
      expect(isNonEmptyString('true')).toBe(true)
      expect(isNonEmptyString('false')).toBe(true)
      expect(isNonEmptyString('null')).toBe(true)
      expect(isNonEmptyString('undefined')).toBe(true)
    })

    it('空文字列を空と判定する', () => {
      expect(isNonEmptyString('')).toBe(false)
    })

    it('空白のみの文字列を空と判定する', () => {
      expect(isNonEmptyString(' ')).toBe(false)
      expect(isNonEmptyString('  ')).toBe(false)
      expect(isNonEmptyString('\t')).toBe(false)
      expect(isNonEmptyString('\n')).toBe(false)
      expect(isNonEmptyString('\r')).toBe(false)
      expect(isNonEmptyString(' \t\n\r ')).toBe(false)
    })

    it('空白を含む文字列を空でないと判定する', () => {
      expect(isNonEmptyString(' hello ')).toBe(true)
      expect(isNonEmptyString('hello world')).toBe(true)
      expect(isNonEmptyString('\thello\n')).toBe(true)
    })

    it('文字列以外の型を空と判定する', () => {
      expect(isNonEmptyString(42)).toBe(false)
      expect(isNonEmptyString(true)).toBe(false)
      expect(isNonEmptyString(false)).toBe(false)
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
      expect(isNonEmptyString([])).toBe(false)
      expect(isNonEmptyString(['hello'])).toBe(false)
      expect(isNonEmptyString({})).toBe(false)
      expect(isNonEmptyString({ hello: 'world' })).toBe(false)
      expect(isNonEmptyString(() => {})).toBe(false)
    })

    it('特殊な Unicode 文字を含む文字列を正しく判定する', () => {
      expect(isNonEmptyString('こんにちは')).toBe(true)
      expect(isNonEmptyString('🎉')).toBe(true)
      expect(isNonEmptyString('𝒽𝑒𝓁𝓁𝑜')).toBe(true)
    })
  })

  describe('isNonEmptyArray', () => {
    it('空でない配列を判定できる', () => {
      expect(isNonEmptyArray([1])).toBe(true)
      expect(isNonEmptyArray([1, 2, 3])).toBe(true)
      expect(isNonEmptyArray(['hello'])).toBe(true)
      expect(isNonEmptyArray(['hello', 'world'])).toBe(true)
      expect(isNonEmptyArray([true, false])).toBe(true)
      expect(isNonEmptyArray([null])).toBe(true)
      expect(isNonEmptyArray([undefined])).toBe(true)
      expect(isNonEmptyArray([{}])).toBe(true)
      expect(isNonEmptyArray([{ key: 'value' }])).toBe(true)
      expect(isNonEmptyArray([[]])).toBe(true) // ネストした空配列も要素として扱う
    })

    it('空配列を空と判定する', () => {
      expect(isNonEmptyArray([])).toBe(false)
    })

    it('配列以外の型を空と判定する', () => {
      expect(isNonEmptyArray('hello')).toBe(false)
      expect(isNonEmptyArray('[]')).toBe(false)
      expect(isNonEmptyArray(42)).toBe(false)
      expect(isNonEmptyArray(true)).toBe(false)
      expect(isNonEmptyArray(false)).toBe(false)
      expect(isNonEmptyArray(null)).toBe(false)
      expect(isNonEmptyArray(undefined)).toBe(false)
      expect(isNonEmptyArray({})).toBe(false)
      expect(isNonEmptyArray({ length: 1 })).toBe(false) // 配列っぽいオブジェクト
      expect(isNonEmptyArray(() => {})).toBe(false)
    })

    it('様々な要素型の配列を正しく判定する', () => {
      expect(isNonEmptyArray([1, 'hello', true, null, undefined, {}, []])).toBe(true)
      expect(isNonEmptyArray([0])).toBe(true) // falsy な値も要素として扱う
      expect(isNonEmptyArray([false])).toBe(true)
      expect(isNonEmptyArray([''])).toBe(true) // 空文字列も要素として扱う
    })

    it('TypeScript の型推論が正しく動作する', () => {
      const stringArray: unknown = ['hello', 'world']
      const numberArray: unknown = [1, 2, 3]
      const mixedArray: unknown = [1, 'hello', true]

      if (isNonEmptyArray<string>(stringArray)) {
        // TypeScript はここで stringArray を string[] として認識する
        expect(stringArray[0]!.charAt(0)).toBe('h')
      }

      if (isNonEmptyArray<number>(numberArray)) {
        // TypeScript はここで numberArray を number[] として認識する
        expect(numberArray[0]!.toFixed(1)).toBe('1.0')
      }

      if (isNonEmptyArray<string | number | boolean>(mixedArray)) {
        // TypeScript はここで mixedArray を (string | number | boolean)[] として認識する
        expect(mixedArray).toHaveLength(3)
      }
    })
  })

  describe('型ガードとしての動作', () => {
    it('isInteger は TypeScript の型を正しく絞り込む', () => {
      const value: unknown = 42
      if (isInteger(value)) {
        // TypeScript はここで value を number として認識する
        expect(value.toFixed(2)).toBe('42.00')
        expect(Math.abs(value)).toBe(42)
      }
    })

    it('isPositiveInteger は TypeScript の型を正しく絞り込む', () => {
      const value: unknown = 42
      if (isPositiveInteger(value)) {
        // TypeScript はここで value を number として認識する
        expect(value > 0).toBe(true)
        expect(value.toString()).toBe('42')
      }
    })

    it('isIntegerInRange は TypeScript の型を正しく絞り込む', () => {
      const value: unknown = 5
      if (isIntegerInRange(value, 1, 10)) {
        // TypeScript はここで value を number として認識する
        expect(value * 2).toBe(10)
        expect(value.toPrecision(1)).toBe('5')
      }
    })

    it('isNonEmptyString は TypeScript の型を正しく絞り込む', () => {
      const value: unknown = 'hello'
      if (isNonEmptyString(value)) {
        // TypeScript はここで value を string として認識する
        expect(value.toUpperCase()).toBe('HELLO')
        expect(value.charAt(0)).toBe('h')
      }
    })
  })
})
