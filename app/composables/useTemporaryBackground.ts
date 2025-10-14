/**
 * 一時的な背景画像切り替え用のComposable
 * Function Callingで選択された背景画像を一時的にChatInterfaceに反映する
 */

import { computed, onUnmounted, ref, shallowRef } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { logger } from '~/utils/logger'

/**
 * LRUキャッシュの実装
 */
class LRUCache<T> {
  private cache = new Map<string, T>()
  private maxSize: number

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // アクセスされたアイテムを最後に移動
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 最も古いアイテムを削除
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }
}

/**
 * 一時的な背景画像管理用のComposable
 */
export function useTemporaryBackground() {
  const settingsStore = useSettingsStore()

  // Object URLのキャッシュ
  const objectUrlCache = new LRUCache<string>(5)

  // 一時的な背景画像のURL
  const temporaryBackgroundUrl = shallowRef<string | null>(null)

  // 元の背景画像URL（一時切り替え前の状態を保存）
  const originalBackgroundUrl = ref<string | null>(null)

  // 一時的な背景が設定されているかどうか
  const hasTemporaryBackground = computed(() => temporaryBackgroundUrl.value !== null)

  /**
   * Base64データURLをObject URLに変換
   * @param dataUrl - Base64データURL
   * @returns Object URL
   */
  const createObjectUrlFromDataUrl = async (dataUrl: string): Promise<string> => {
    // キャッシュをチェック
    const cachedUrl = objectUrlCache.get(dataUrl)
    if (cachedUrl) {
      return cachedUrl
    }

    try {
      // Base64データをBlobに変換
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      // キャッシュに保存
      objectUrlCache.set(dataUrl, objectUrl)
      return objectUrl
    } catch (error) {
      logger.error('[TemporaryBackground] Object URL作成に失敗しました', {
        component: 'useTemporaryBackground',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return dataUrl // フォールバックとして元のURLを返す
    }
  }

  /**
   * 一時的な背景画像を設定
   * @param imageUrl - 設定する背景画像のURL
   */
  const setTemporaryBackground = async (imageUrl: string) => {
    // 元の背景画像を保存（まだ保存されていない場合のみ）
    if (originalBackgroundUrl.value === null) {
      originalBackgroundUrl.value = settingsStore.settings.backgroundImageDataUrl
    }

    // Base64データURLの場合はObject URLに変換
    let processedUrl = imageUrl
    if (imageUrl.startsWith('data:')) {
      processedUrl = await createObjectUrlFromDataUrl(imageUrl)
    }

    temporaryBackgroundUrl.value = processedUrl
    logger.info('[TemporaryBackground] 一時的な背景画像を設定しました', {
      component: 'useTemporaryBackground',
      temporaryUrl: processedUrl,
      originalUrl: originalBackgroundUrl.value,
      isObjectUrl: processedUrl !== imageUrl,
    })
  }

  /**
   * Object URLをクリーンアップ
   * @param url - クリーンアップするURL
   */
  const cleanupObjectUrl = (url: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
      logger.debug('[TemporaryBackground] Object URLをクリーンアップしました', {
        component: 'useTemporaryBackground',
        url,
      })
    }
  }

  /**
   * 元の背景画像に戻す
   */
  const restoreOriginalBackground = () => {
    // 現在のObject URLをクリーンアップ
    if (temporaryBackgroundUrl.value) {
      cleanupObjectUrl(temporaryBackgroundUrl.value)
    }

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

  /**
   * コンポーネントのアンマウント時にクリーンアップ
   */
  onUnmounted(() => {
    // 現在のObject URLをクリーンアップ
    if (temporaryBackgroundUrl.value) {
      cleanupObjectUrl(temporaryBackgroundUrl.value)
    }

    // キャッシュ内のすべてのObject URLをクリーンアップ
    objectUrlCache.clear()

    logger.debug('[TemporaryBackground] コンポーネントアンマウント時のクリーンアップを実行しました', {
      component: 'useTemporaryBackground',
    })
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
