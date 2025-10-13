/**
 * 一時的な背景画像切り替え用のComposable
 * Function Callingで選択された背景画像を一時的にChatInterfaceに反映する
 */

import { computed, ref } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { logger } from '~/utils/logger'

/**
 * 一時的な背景画像管理用のComposable
 */
export function useTemporaryBackground() {
  const settingsStore = useSettingsStore()

  // 一時的な背景画像のURL
  const temporaryBackgroundUrl = ref<string | null>(null)

  // 元の背景画像URL（一時切り替え前の状態を保存）
  const originalBackgroundUrl = ref<string | null>(null)

  // 一時的な背景が設定されているかどうか
  const hasTemporaryBackground = computed(() => temporaryBackgroundUrl.value !== null)

  /**
   * 一時的な背景画像を設定
   * @param imageUrl - 設定する背景画像のURL
   */
  const setTemporaryBackground = (imageUrl: string) => {
    // 元の背景画像を保存（まだ保存されていない場合のみ）
    if (originalBackgroundUrl.value === null) {
      originalBackgroundUrl.value = settingsStore.settings.backgroundImageDataUrl
    }

    temporaryBackgroundUrl.value = imageUrl
    logger.info('[TemporaryBackground] 一時的な背景画像を設定しました', {
      component: 'useTemporaryBackground',
      temporaryUrl: imageUrl,
      originalUrl: originalBackgroundUrl.value,
    })
  }

  /**
   * 元の背景画像に戻す
   */
  const restoreOriginalBackground = () => {
    temporaryBackgroundUrl.value = null
    originalBackgroundUrl.value = null
    logger.info('[TemporaryBackground] 元の背景画像に戻しました', {
      component: 'useTemporaryBackground',
    })
  }

  /**
   * 現在の背景画像URLを取得（一時的な背景が設定されている場合はそれを優先）
   */
  const currentBackgroundUrl = computed(() => {
    return temporaryBackgroundUrl.value || settingsStore.settings.backgroundImageDataUrl
  })

  /**
   * 背景画像のスタイルを取得
   */
  const backgroundStyle = computed(() => {
    const url = currentBackgroundUrl.value
    if (!url) return {}

    return {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    } as Record<string, string>
  })

  return {
    temporaryBackgroundUrl,
    originalBackgroundUrl,
    hasTemporaryBackground,
    currentBackgroundUrl,
    backgroundStyle,
    setTemporaryBackground,
    restoreOriginalBackground,
  }
}
