import { beforeEach, mock } from 'bun:test'

// localStorage のモック
const localStorageMock = {
  getItem: mock(() => null),
  setItem: mock(() => {}),
  removeItem: mock(() => {}),
  clear: mock(() => {}),
  length: 0,
  key: mock(() => null),
}

// sessionStorage のモック
const sessionStorageMock = {
  getItem: mock(() => null),
  setItem: mock(() => {}),
  removeItem: mock(() => {}),
  clear: mock(() => {}),
  length: 0,
  key: mock(() => null),
}

// グローバルオブジェクトにモックを設定
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

Object.defineProperty(global, 'sessionStorage', {
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
Object.defineProperty(global, 'document', {
  value: {
    documentElement: {
      style: {
        setProperty: mock(() => {}),
      },
    },
    head: {
      appendChild: mock(() => {}),
    },
    getElementById: mock(() => null),
    createElement: mock(() => ({
      id: '',
      textContent: '',
    })),
  },
  writable: true,
})
