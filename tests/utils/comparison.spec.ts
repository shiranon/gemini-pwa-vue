import { describe, expect, it } from 'bun:test'
import { deepEqual, deepEqualExcluding, deepEqualKeys } from '~/utils/comparison'

describe('comparison utilities', () => {
  describe('deepEqual', () => {
    it('同じ参照の場合は true を返す', () => {
      const obj = { a: 1 }
      expect(deepEqual(obj, obj)).toBe(true)
    })

    it('null または undefined の比較が正しく動作する', () => {
      expect(deepEqual(null, null)).toBe(true)
      expect(deepEqual(undefined, undefined)).toBe(true)
      expect(deepEqual(null, undefined)).toBe(false)
      expect(deepEqual(undefined, null)).toBe(false)
    })

    it('型が異なる場合は false を返す', () => {
      // @ts-expect-error 型が異なる場合は false を返す
      expect(deepEqual(1, '1')).toBe(false)
      // @ts-expect-error 型が異なる場合は false を返す
      expect(deepEqual(true, 1)).toBe(false)
      expect(deepEqual(null, 0)).toBe(false)
    })

    it('プリミティブ型の比較が正しく動作する', () => {
      expect(deepEqual(1, 1)).toBe(true)
      expect(deepEqual(1, 2)).toBe(false)
      expect(deepEqual('hello', 'hello')).toBe(true)
      expect(deepEqual('hello', 'world')).toBe(false)
      expect(deepEqual(true, true)).toBe(true)
      expect(deepEqual(true, false)).toBe(false)
    })

    it('配列の比較が正しく動作する', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
      expect(deepEqual([], [])).toBe(true)
    })

    it('ネストした配列の比較が正しく動作する', () => {
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true)
      expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false)
    })

    it('オブジェクトの比較が正しく動作する', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
      expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
      expect(deepEqual({}, {})).toBe(true)
    })

    it('ネストしたオブジェクトの比較が正しく動作する', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
    })

    it('複雑なオブジェクトの比較が正しく動作する', () => {
      const obj1 = {
        a: 1,
        b: [1, 2, { c: 3 }],
        c: { d: 4, e: [5, 6] },
      }
      const obj2 = {
        a: 1,
        b: [1, 2, { c: 3 }],
        c: { d: 4, e: [5, 6] },
      }
      const obj3 = {
        a: 1,
        b: [1, 2, { c: 4 }],
        c: { d: 4, e: [5, 6] },
      }

      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj3)).toBe(false)
    })

    it('配列と非配列の比較が正しく動作する', () => {
      expect(deepEqual([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(false)
    })

    it('異なる順序のオブジェクトプロパティでも正しく比較される', () => {
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    })
  })

  describe('deepEqualExcluding', () => {
    it('指定したキーを除外して比較する', () => {
      const obj1 = { a: 1, b: 2, c: 3 }
      const obj2 = { a: 1, b: 2, c: 4 }
      const obj3 = { a: 1, b: 2, c: 3 }

      expect(deepEqualExcluding(obj1, obj2, ['c'])).toBe(true)
      expect(deepEqualExcluding(obj1, obj3, ['c'])).toBe(true)
    })

    it('複数のキーを除外して比較する', () => {
      const obj1 = { a: 1, b: 2, c: 3, d: 4 }
      const obj2 = { a: 1, b: 2, c: 5, d: 6 }

      expect(deepEqualExcluding(obj1, obj2, ['c', 'd'])).toBe(true)
    })

    it('除外キー以外が異なる場合は false を返す', () => {
      const obj1 = { a: 1, b: 2, c: 3 }
      const obj2 = { a: 1, b: 3, c: 4 }

      expect(deepEqualExcluding(obj1, obj2, ['c'])).toBe(false)
    })

    it('除外キーが存在しない場合でも正しく動作する', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 2 }

      // @ts-expect-error 型が異なる場合は false を返す
      expect(deepEqualExcluding(obj1, obj2, ['c'])).toBe(true)
    })

    it('ネストしたオブジェクトでも正しく動作する', () => {
      const obj1 = { a: { b: 1, c: 2 }, d: 3 }
      const obj2 = { a: { b: 1, c: 3 }, d: 4 }

      expect(deepEqualExcluding(obj1, obj2, ['d'])).toBe(false) // a の内容が異なる
      expect(deepEqualExcluding(obj1, obj2, ['a'])).toBe(false) // d の値が異なる

      // 同じ値のオブジェクトでテスト
      const obj3 = { a: { b: 1, c: 2 }, d: 5 }
      const obj4 = { a: { b: 1, c: 2 }, d: 6 }
      expect(deepEqualExcluding(obj3, obj4, ['d'])).toBe(true) // a の内容は同じ
    })
  })

  describe('deepEqualKeys', () => {
    it('指定したキーのみを比較する', () => {
      const obj1 = { a: 1, b: 2, c: 3 }
      const obj2 = { a: 1, b: 2, c: 4 }

      expect(deepEqualKeys(obj1, obj2, ['a', 'b'])).toBe(true)
      expect(deepEqualKeys(obj1, obj2, ['a', 'c'])).toBe(false)
    })

    it('存在しないキーを指定した場合は false を返す', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 2 }

      // @ts-expect-error 型が異なる場合は false を返す
      expect(deepEqualKeys(obj1, obj2, ['a', 'c'])).toBe(false)
    })

    it('空のキー配列の場合は true を返す', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 2 }

      expect(deepEqualKeys(obj1, obj2, [])).toBe(true)
    })

    it('ネストしたオブジェクトでも正しく動作する', () => {
      const obj1 = { a: { b: 1, c: 2 }, d: 3 }
      const obj2 = { a: { b: 1, c: 3 }, d: 3 }

      expect(deepEqualKeys(obj1, obj2, ['d'])).toBe(true)
      expect(deepEqualKeys(obj1, obj2, ['a'])).toBe(false)
    })
  })

  describe('エッジケース', () => {
    it('空のオブジェクトと空の配列の比較', () => {
      expect(deepEqual({}, [])).toBe(false)
    })

    it('undefined プロパティの比較', () => {
      expect(deepEqual({ a: undefined }, { a: undefined })).toBe(true)
      expect(deepEqual({ a: undefined }, {})).toBe(false)
    })

    it('null プロパティの比較', () => {
      expect(deepEqual({ a: null }, { a: null })).toBe(true)
      expect(deepEqual({ a: null }, {})).toBe(false)
    })

    it('関数プロパティの比較', () => {
      const fn1 = () => {}
      const fn2 = () => {}
      expect(deepEqual({ a: fn1 }, { a: fn1 })).toBe(true)
      expect(deepEqual({ a: fn1 }, { a: fn2 })).toBe(false)
    })

    it('Date オブジェクトの比較', () => {
      const date1 = new Date('2023-01-01')
      const date2 = new Date('2023-01-01')
      const date3 = new Date('2023-01-02')

      expect(deepEqual({ a: date1 }, { a: date1 })).toBe(true)
      expect(deepEqual({ a: date1 }, { a: date2 })).toBe(true) // 同じ値のDateオブジェクト
      expect(deepEqual({ a: date1 }, { a: date3 })).toBe(false)
    })
  })
})
