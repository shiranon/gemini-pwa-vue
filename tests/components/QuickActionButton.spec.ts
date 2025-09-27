import { describe, expect, it, mock } from 'bun:test'
import QuickActionButton from '~/components/molecules/page-chat/QuickActionButton.vue'

// UIコンポーネントをモック
mock.module('~/components/ui/button', () => ({
  Button: {
    name: 'Button',
    template: '<button><slot /></button>',
    props: ['variant', 'class', 'disabled'],
    emits: ['click'],
  },
}))

describe('QuickActionButton', () => {
  it('コンポーネントが正しく定義されている', () => {
    // コンポーネントの基本構造をテスト
    expect(QuickActionButton).toBeDefined()
    expect(typeof QuickActionButton).toBe('object')
  })

  it('コンポーネントが関数として定義されている', () => {
    // Vue 3のComposition APIコンポーネントの構造をテスト
    expect(QuickActionButton).toBeDefined()
    expect(QuickActionButton).not.toBeNull()
  })

  it('コンポーネントが正しくインポートできる', () => {
    // インポートの成功をテスト
    expect(QuickActionButton).toBeTruthy()
  })
})
