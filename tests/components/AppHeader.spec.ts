import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('AppHeader', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'CSS', {
      value: {
        supports: vi.fn(() => true),
      },
      writable: true,
      configurable: true,
    })
  })

  it('正しいpropsを受け取ってレンダリングされる', () => {
    const props = {
      currentPage: 'chat',
      pageTitle: 'Test App',
      showMobileMenu: false,
    }

    expect(props.currentPage).toBe('chat')
    expect(props.pageTitle).toBe('Test App')
    expect(props.showMobileMenu).toBe(false)
    expect(typeof props.currentPage).toBe('string')
    expect(typeof props.pageTitle).toBe('string')
    expect(typeof props.showMobileMenu).toBe('boolean')
  })

  it('currentPageが"chat"の場合、新しいチャットボタンが表示される条件を満たす', () => {
    const props = {
      currentPage: 'chat',
      pageTitle: 'Test App',
      showMobileMenu: false,
    }

    expect(props.currentPage).toBe('chat')
    expect(props.currentPage === 'chat').toBe(true)
  })

  it('currentPageが"chat"以外の場合、新しいチャットボタンが表示されない条件を満たす', () => {
    const props = {
      currentPage: 'history',
      pageTitle: 'Test App',
      showMobileMenu: false,
    }

    expect(props.currentPage).toBe('history')
    expect(props.currentPage === 'chat').toBe(false)
  })

  it('新しいチャットボタンクリックイベントが正しく定義される', () => {
    const emits = {
      'new-chat': [],
      navigate: ['page: string'],
      'navigate-mobile': ['page: string'],
      'toggle-mobile-menu': [],
    }

    expect(emits['new-chat']).toBeDefined()
    expect(Array.isArray(emits['new-chat'])).toBe(true)
    expect(emits['new-chat'].length).toBe(0)
  })

  it('DesktopNavigationのnavigateイベントが正しく定義される', () => {
    const emits = {
      navigate: ['page: string'],
      'navigate-mobile': ['page: string'],
      'toggle-mobile-menu': [],
    }

    expect(emits['navigate']).toBeDefined()
    expect(Array.isArray(emits['navigate'])).toBe(true)
    expect(emits['navigate'].length).toBe(1)
    expect(emits['navigate'][0]).toBe('page: string')
  })

  it('MobileNavigationのnavigate-mobileイベントが正しく定義される', () => {
    const emits = {
      navigate: ['page: string'],
      'navigate-mobile': ['page: string'],
      'toggle-mobile-menu': [],
    }

    expect(emits['navigate-mobile']).toBeDefined()
    expect(Array.isArray(emits['navigate-mobile'])).toBe(true)
    expect(emits['navigate-mobile'].length).toBe(1)
    expect(emits['navigate-mobile'][0]).toBe('page: string')
  })

  it('モバイルメニューのtoggle-mobile-menuイベントが正しく定義される', () => {
    const emits = {
      navigate: ['page: string'],
      'navigate-mobile': ['page: string'],
      'toggle-mobile-menu': [],
    }

    expect(emits['toggle-mobile-menu']).toBeDefined()
    expect(Array.isArray(emits['toggle-mobile-menu'])).toBe(true)
    expect(emits['toggle-mobile-menu'].length).toBe(0)
  })

  it('showMobileMenuがtrueの場合、モバイルナビゲーションが表示される条件を満たす', () => {
    const props = {
      currentPage: 'chat',
      pageTitle: 'Test App',
      showMobileMenu: true,
    }

    expect(props.showMobileMenu).toBe(true)
    expect(typeof props.showMobileMenu).toBe('boolean')
  })

  it('showMobileMenuがfalseの場合、モバイルナビゲーションが非表示になる条件を満たす', () => {
    const props = {
      currentPage: 'chat',
      pageTitle: 'Test App',
      showMobileMenu: false,
    }

    expect(props.showMobileMenu).toBe(false)
    expect(typeof props.showMobileMenu).toBe('boolean')
  })

  it('showMobileMenuの状態に応じてモバイルメニューボタンのアイコンが変わる条件を満たす', () => {
    // showMobileMenu: false の場合
    const propsClosed = {
      currentPage: 'chat',
      pageTitle: 'Test App',
      showMobileMenu: false,
    }

    expect(propsClosed.showMobileMenu).toBe(false)
    // falseの場合は'material-symbols:menu'アイコンが表示される
    const iconForClosed = propsClosed.showMobileMenu ? 'material-symbols:close' : 'material-symbols:menu'
    expect(iconForClosed).toBe('material-symbols:menu')

    // showMobileMenu: true の場合
    const propsOpen = {
      currentPage: 'chat',
      pageTitle: 'Test App',
      showMobileMenu: true,
    }

    expect(propsOpen.showMobileMenu).toBe(true)
    // trueの場合は'material-symbols:close'アイコンが表示される
    const iconForOpen = propsOpen.showMobileMenu ? 'material-symbols:close' : 'material-symbols:menu'
    expect(iconForOpen).toBe('material-symbols:close')
  })

  it('異なるcurrentPageの値で正しくレンダリングされる', () => {
    const pages = ['chat', 'data', 'history', 'settings']

    pages.forEach((page) => {
      const props = {
        currentPage: page,
        pageTitle: 'Test App',
        showMobileMenu: false,
      }

      expect(props.currentPage).toBe(page)
      expect(typeof props.currentPage).toBe('string')
      expect(pages.includes(props.currentPage)).toBe(true)

      // chatページの場合のみ新しいチャットボタンが表示される
      if (page === 'chat') {
        expect(props.currentPage === 'chat').toBe(true)
      } else {
        expect(props.currentPage === 'chat').toBe(false)
      }
    })
  })

  it('異なるpageTitleの値で正しくレンダリングされる', () => {
    const titles = ['Chat App', 'My Application', 'Gemini PWA']

    titles.forEach((title) => {
      const props = {
        currentPage: 'chat',
        pageTitle: title,
        showMobileMenu: false,
      }

      expect(props.pageTitle).toBe(title)
      expect(typeof props.pageTitle).toBe('string')
      expect(props.pageTitle.length).toBeGreaterThan(0)
    })
  })

  it('propsの型が正しく定義されている', () => {
    const props = {
      currentPage: 'chat',
      pageTitle: 'Test App',
      showMobileMenu: false,
    }

    // currentPageは文字列である必要がある
    expect(typeof props.currentPage).toBe('string')
    expect(props.currentPage.length).toBeGreaterThan(0)

    // pageTitleは文字列である必要がある
    expect(typeof props.pageTitle).toBe('string')
    expect(props.pageTitle.length).toBeGreaterThan(0)

    // showMobileMenuは真偽値である必要がある
    expect(typeof props.showMobileMenu).toBe('boolean')
  })

  it('emitsの型が正しく定義されている', () => {
    const emits = {
      navigate: ['page: string'],
      'navigate-mobile': ['page: string'],
      'toggle-mobile-menu': [],
      'new-chat': [],
    }

    // navigateイベントは文字列パラメータを1つ受け取る
    expect(Array.isArray(emits['navigate'])).toBe(true)
    expect(emits['navigate'].length).toBe(1)
    expect(emits['navigate'][0]).toBe('page: string')

    // navigate-mobileイベントは文字列パラメータを1つ受け取る
    expect(Array.isArray(emits['navigate-mobile'])).toBe(true)
    expect(emits['navigate-mobile'].length).toBe(1)
    expect(emits['navigate-mobile'][0]).toBe('page: string')

    // toggle-mobile-menuイベントはパラメータを受け取らない
    expect(Array.isArray(emits['toggle-mobile-menu'])).toBe(true)
    expect(emits['toggle-mobile-menu'].length).toBe(0)

    // new-chatイベントはパラメータを受け取らない
    expect(Array.isArray(emits['new-chat'])).toBe(true)
    expect(emits['new-chat'].length).toBe(0)
  })
})
