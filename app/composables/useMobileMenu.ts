import { ref } from 'vue'

/**
 * モバイルメニューの状態管理composable
 * レスポンシブUIでのメニュー表示/非表示の制御
 */
export const useMobileMenu = () => {
  const showMobileMenu = ref(false)

  const toggleMobileMenu = () => {
    showMobileMenu.value = !showMobileMenu.value
  }

  const closeMobileMenu = () => {
    showMobileMenu.value = false
  }

  const openMobileMenu = () => {
    showMobileMenu.value = true
  }

  return {
    showMobileMenu,
    toggleMobileMenu,
    closeMobileMenu,
    openMobileMenu,
  }
}
