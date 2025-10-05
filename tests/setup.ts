import { beforeEach } from 'bun:test'
import { vi } from 'vitest'

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

// sessionStorage のモック
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

// グローバルオブジェクトにモックを設定
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

// 各テスト前にモックをリセット
beforeEach(() => {
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  localStorageMock.key.mockClear()

  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
  sessionStorageMock.key.mockClear()
})

// import.meta.client のモック
Object.defineProperty(import.meta, 'client', {
  value: true,
  writable: true,
})

// document のモック（必要に応じて）
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {
      setProperty: vi.fn(),
    },
  },
  writable: true,
})

Object.defineProperty(document, 'head', {
  value: {
    appendChild: vi.fn(),
  },
  writable: true,
})

Object.defineProperty(document, 'getElementById', {
  value: vi.fn(() => null),
  writable: true,
})

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    id: '',
    textContent: '',
  })),
  writable: true,
})
