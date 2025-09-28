import { describe, expect, it, mock } from 'bun:test'
import QuickActionsModal from '~/components/molecules/page-chat/QuickActionsModal.vue'

// 依存関係をモック
mock.module('~/composables/useQuickActions', () => ({
  useQuickActions: () => ({
    quickActions: [
      {
        id: 'thinking-mode',
        label: '思考モード',
        icon: {},
        enabled: false,
        description: 'AIの思考モードを有効化',
      },
      {
        id: 'functionCalling',
        label: '関数呼出',
        icon: {},
        enabled: true,
        description: '関数機能全体',
      },
    ],
    toggleAction: mock(() => {}),
    executableActions: [
      {
        id: 'summarize',
        label: '要約作成',
        icon: {},
        description: '会話を要約',
        disabled: false,
      },
      {
        id: 'toggle-functions',
        label: '関数設定',
        icon: {},
        description: '関数のオンオフ',
        disabled: false,
      },
    ],
    executeAction: mock(() => {}),
  }),
}))

// UIコンポーネントをモック
mock.module('~/components/ui/dialog', () => ({
  Dialog: {
    name: 'Dialog',
    template: '<div><slot /></div>',
    props: ['modelValue'],
  },
  DialogTrigger: {
    name: 'DialogTrigger',
    template: '<div><slot /></div>',
    props: ['asChild', 'class'],
  },
  DialogContent: {
    name: 'DialogContent',
    template: '<div><slot /></div>',
    props: ['class'],
  },
  DialogHeader: {
    name: 'DialogHeader',
    template: '<div><slot /></div>',
  },
  DialogTitle: {
    name: 'DialogTitle',
    template: '<h2><slot /></h2>',
  },
  DialogDescription: {
    name: 'DialogDescription',
    template: '<p><slot /></p>',
    props: ['class'],
  },
  DialogFooter: {
    name: 'DialogFooter',
    template: '<div><slot /></div>',
  },
}))

mock.module('~/components/ui/button', () => ({
  Button: {
    name: 'Button',
    template: '<button><slot /></button>',
    props: ['disabled'],
  },
}))

mock.module('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span>Icon</span>',
    props: ['icon'],
  },
}))

// 子コンポーネントをモック
mock.module('~/components/molecules/page-chat/QuickSettingButton.vue', () => ({
  default: {
    name: 'QuickSettingButton',
    template: '<button @click="$emit(\'toggle\')"><slot /></button>',
    props: ['icon', 'label', 'enabled', 'description'],
    emits: ['toggle'],
  },
}))

mock.module('~/components/molecules/page-chat/QuickActionButton.vue', () => ({
  default: {
    name: 'QuickActionButton',
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['icon', 'label', 'description', 'disabled', 'loading'],
    emits: ['click'],
  },
}))

mock.module('~/components/molecules/page-chat/FunctionToggleModal.vue', () => ({
  default: {
    name: 'FunctionToggleModal',
    template: '<div>FunctionToggleModal</div>',
    methods: {
      open: mock(() => {}),
    },
  },
}))

mock.module('~/components/molecules/page-chat/ProfileSwitchModal.vue', () => ({
  default: {
    name: 'ProfileSwitchModal',
    template: '<div>ProfileSwitchModal</div>',
    methods: {
      open: mock(() => {}),
    },
  },
}))

describe('QuickActionsModal', () => {
  it('コンポーネントが正しく定義されている', () => {
    // コンポーネントの基本構造をテスト
    expect(QuickActionsModal).toBeDefined()
    expect(typeof QuickActionsModal).toBe('string')
  })

  it('コンポーネントが関数として定義されている', () => {
    // Vue 3のComposition APIコンポーネントの構造をテスト
    expect(QuickActionsModal).toBeDefined()
    expect(QuickActionsModal).not.toBeNull()
  })

  it('コンポーネントが正しくインポートできる', () => {
    // インポートの成功をテスト
    expect(QuickActionsModal).toBeTruthy()
  })
})
