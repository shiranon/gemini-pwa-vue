import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * ナビゲーション管理のcomposable
 * PWAアプリケーションの基本的なページ遷移とページ状態管理を提供
 */
export const useNavigation = () => {
  const route = useRoute()
  const router = useRouter()

  // 現在のページ情報
  const currentPage = computed(() => {
    const path = route.path
    if (path === '/') return 'chat'
    if (path === '/history') return 'history'
    if (path === '/settings') return 'settings'
    if (path === '/data') return 'data'
    return 'chat'
  })

  // ページタイトル
  const pageTitle = computed(() => {
    switch (currentPage.value) {
      case 'history':
        return 'チャット履歴'
      case 'settings':
        return '設定'
      case 'chat':
        return 'チャット'
      case 'data':
        return 'データ管理'
      default:
        return 'Gemini Pwa Assistant'
    }
  })

  // ナビゲーション関数
  const navigateTo = (page: string) => {
    const routes = {
      chat: '/',
      history: '/history',
      settings: '/settings',
      data: '/data',
    }
    router.push(routes[page as keyof typeof routes] || '/')
  }

  return {
    currentPage,
    pageTitle,
    navigateTo,
  }
}
