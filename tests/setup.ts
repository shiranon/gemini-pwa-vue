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

// Nuxtプラグインのモック
Object.defineProperty(global, '$nuxt', {
  value: {
    $router: {
      push: mock(() => {}),
      replace: mock(() => {}),
    },
    $route: {
      path: '/',
      query: {},
      params: {},
    },
  },
  writable: true,
})

// useFunctionCallingコンポーザブルのモック
// グローバルなモックインスタンスを一度だけ作成して再利用
const globalMockFunctionCallingInstance = {
  functionRegistry: new Map(),
  executionLogs: [],
  registerFunction: mock(() => {}),
  registerFunctionDefinition: mock(() => {}),
  unregisterFunction: mock(() => {}),
  toggleFunction: mock(() => {}),
  setFunctionEnablement: mock(() => {}),
  getEnabledFunctionDeclarations: mock(() => []),
  getEnabledFunctionNames: mock(() => []),
  getFunctionRegistryEntries: mock(() => []),
  refreshManageBackgroundDeclaration: mock(() => {}),
  executeFunction: mock(() => Promise.resolve({})),
  executeFunctions: mock(() => Promise.resolve([])),
  clearExecutionLogs: mock(() => {}),
  initializeDefaultFunctions: mock(() => {}),
  getRegistryStats: mock(() => ({})),
}

const mockUseFunctionCalling = () => globalMockFunctionCallingInstance

// useFunctionCallingコンポーザブルのモック
Object.defineProperty(global, 'useFunctionCalling', {
  value: mockUseFunctionCalling,
  writable: true,
})

// その他のNuxtプラグイン関数のモック
Object.defineProperty(global, 'navigateTo', {
  value: mock(() => {}),
  writable: true,
})

Object.defineProperty(global, 'useRouter', {
  value: mock(() => ({
    push: mock(() => {}),
    replace: mock(() => {}),
  })),
  writable: true,
})

Object.defineProperty(global, 'useRoute', {
  value: mock(() => ({
    path: '/',
    query: {},
    params: {},
  })),
  writable: true,
})

// IndexedDBのモック
Object.defineProperty(global, 'indexedDB', {
  value: {
    open: mock(() => ({
      onsuccess: null,
      onerror: null,
      result: {
        transaction: mock(() => ({
          objectStore: mock(() => ({
            add: mock(() => {}),
            get: mock(() => {}),
            put: mock(() => {}),
            delete: mock(() => {}),
            clear: mock(() => {}),
          })),
        })),
      },
    })),
  },
  writable: true,
})

// Dexieのモック
Object.defineProperty(global, 'Dexie', {
  value: mock(() => ({
    open: mock(() => Promise.resolve()),
    close: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    version: mock(() => ({
      stores: mock(() => ({})),
    })),
  })),
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

  // useFunctionCallingのモックもリセット
  globalMockFunctionCallingInstance.registerFunction.mockClear()
  globalMockFunctionCallingInstance.registerFunctionDefinition.mockClear()
  globalMockFunctionCallingInstance.unregisterFunction.mockClear()
  globalMockFunctionCallingInstance.toggleFunction.mockClear()
  globalMockFunctionCallingInstance.setFunctionEnablement.mockClear()
  globalMockFunctionCallingInstance.getEnabledFunctionDeclarations.mockClear()
  globalMockFunctionCallingInstance.getEnabledFunctionNames.mockClear()
  globalMockFunctionCallingInstance.getFunctionRegistryEntries.mockClear()
  globalMockFunctionCallingInstance.refreshManageBackgroundDeclaration.mockClear()
  globalMockFunctionCallingInstance.executeFunction.mockClear()
  globalMockFunctionCallingInstance.executeFunctions.mockClear()
  globalMockFunctionCallingInstance.clearExecutionLogs.mockClear()
  globalMockFunctionCallingInstance.initializeDefaultFunctions.mockClear()
  globalMockFunctionCallingInstance.getRegistryStats.mockClear()
})
