import { computed, ref } from 'vue'
import { useImageUpload } from '~/composables/useImageUpload'
import { IMAGE_LIMITS } from '~/constants/constants'
import {
  dbCreateBackgroundCategory,
  dbDeleteBackgroundCategory,
  dbDeleteBackgroundImage,
  dbGetAllBackgroundCategories,
  dbGetBackgroundImageByNames,
  dbGetCategoryImages,
  dbUpdateBackgroundCategory,
  dbUploadBackgroundImage,
} from '~/lib/database'
import { useSettingsStore } from '~/stores/settings'
import type { BackgroundCategoryRecord, BackgroundImageRecord, DatabaseOperationResult } from '~/types/database'
import { logger } from '~/utils/logger'

/**
 * 背景画像管理Composable
 */
export function useBackgroundImages() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 画像アップロード機能（設定に基づいて最適化を有効化）
  const settingsStore = useSettingsStore()
  const imageUpload = useImageUpload({
    maxSize: IMAGE_LIMITS.MAX_FILE_SIZE,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
    enableOptimization: settingsStore.settings.enableImageOptimization,
    optimizationOptions: {
      maxWidth: settingsStore.settings.maxImageWidth,
      maxHeight: settingsStore.settings.maxImageHeight,
      quality: settingsStore.settings.compressionQuality,
      enableWebP: settingsStore.settings.enableWebPConversion,
      webpQuality: settingsStore.settings.webpQuality,
    },
  })

  // ============================================================================
  // 共通ユーティリティ
  // ============================================================================

  /** ブラウザ環境でpath.parse(file.name).nameの動作を再現 */
  const getFileNameWithoutExtension = (filename: string): string => {
    // 最後のドットの位置を探す
    const lastDotIndex = filename.lastIndexOf('.')

    // ドットがない場合、または最初の文字がドットの場合（隠しファイル）はそのまま返す
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return filename
    }

    // 最後のドットより前の部分を返す
    return filename.substring(0, lastDotIndex)
  }

  /** データベース操作の共通エラーハンドリング */
  const handleDatabaseOperation = async <T>(operation: () => Promise<DatabaseOperationResult<T>>, errorMessage: string, successLog?: string): Promise<T | null> => {
    try {
      isLoading.value = true
      error.value = null

      const result = await operation()
      if (!result.success) {
        error.value = result.error || errorMessage
        return null
      }

      if (successLog) {
        logger.info(successLog, { component: 'useBackgroundImages' })
      }
      return result.data!
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage
      error.value = errorMsg
      logger.error(errorMessage, { component: 'useBackgroundImages' }, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /** 画像操作の統一エラーハンドリング */
  const handleImageOperation = async <T>(operation: () => Promise<T>, errorMessage: string, successLog?: string, fallbackValue?: T): Promise<T | null> => {
    try {
      isLoading.value = true
      error.value = null

      const result = await operation()

      if (successLog) {
        logger.info(successLog, { component: 'useBackgroundImages' })
      }
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage
      error.value = errorMsg
      logger.error(errorMessage, { component: 'useBackgroundImages' }, err)
      return fallbackValue ?? null
    } finally {
      isLoading.value = false
    }
  }

  /** 一括操作の統一エラーハンドリング */
  const handleBulkOperation = async <T>(operation: () => Promise<T>, errorMessage: string, fallbackValue: T): Promise<T> => {
    try {
      isLoading.value = true
      error.value = null

      const result = await operation()
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage
      error.value = errorMsg
      logger.error(errorMessage, { component: 'useBackgroundImages' }, err)
      return fallbackValue
    } finally {
      isLoading.value = false
    }
  }

  /** エラー状態をクリア */
  const clearAllErrors = () => {
    error.value = null
    imageUpload.clearError()
  }

  // ============================================================================
  // カテゴリー管理
  // ============================================================================

  /** カテゴリーを作成 */
  const createCategory = async (name: string, description?: string): Promise<BackgroundCategoryRecord | null> => {
    return handleDatabaseOperation(() => dbCreateBackgroundCategory(name, description), 'カテゴリーの作成に失敗しました', `カテゴリーを作成: ${name}`)
  }

  /** 全カテゴリーを取得 */
  const getCategories = async (): Promise<BackgroundCategoryRecord[]> => {
    const result = await handleDatabaseOperation(() => dbGetAllBackgroundCategories(), 'カテゴリー一覧の取得に失敗しました')
    return result || []
  }

  /** カテゴリーを更新 */
  const updateCategory = async (id: string, updates: Partial<Pick<BackgroundCategoryRecord, 'name' | 'description'>>): Promise<BackgroundCategoryRecord | null> => {
    return handleDatabaseOperation(() => dbUpdateBackgroundCategory(id, updates), 'カテゴリーの更新に失敗しました', `カテゴリーを更新: ${id}`)
  }

  /** カテゴリーを削除 */
  const deleteCategory = async (id: string): Promise<boolean> => {
    const result = await handleDatabaseOperation(() => dbDeleteBackgroundCategory(id), 'カテゴリーの削除に失敗しました', `カテゴリーを削除: ${id}`)
    return result !== null
  }

  // ============================================================================
  // 画像管理
  // ============================================================================

  /** 画像をアップロード */
  const uploadImage = async (categoryId: string, name: string, file: File | import('~/types/chat').AttachedFile): Promise<BackgroundImageRecord | null> => {
    return handleImageOperation(
      async () => {
        let base64Data: string
        let mimeType: string
        let size: number

        // FileオブジェクトかAttachedFileかで処理を分岐
        if (file instanceof File) {
          // useImageUploadでファイルを処理
          const uploadResult = await imageUpload.uploadImage(file)
          if (!uploadResult) {
            throw new Error(imageUpload.error.value || '画像の処理に失敗しました')
          }
          base64Data = uploadResult.base64Data
          mimeType = uploadResult.mimeType
          size = uploadResult.size
        } else {
          // AttachedFileの場合は既にBase64データが含まれている
          base64Data = file.data
          mimeType = file.type
          size = file.size
        }

        // Base64データから実際のデータ部分を抽出
        const base64 = base64Data.split(',')[1] || base64Data
        if (!base64) {
          throw new Error('画像データの抽出に失敗しました')
        }

        const result = await dbUploadBackgroundImage(categoryId, name, base64, mimeType, size)
        if (!result.success) {
          throw new Error(result.error || '画像のアップロードに失敗しました')
        }

        return result.data!
      },
      '画像のアップロードに失敗しました',
      `画像をアップロード: ${name}`
    )
  }

  /** 画像を削除 */
  const deleteImage = async (imageId: string): Promise<boolean> => {
    const result = await handleImageOperation(
      async () => {
        const result = await dbDeleteBackgroundImage(imageId)
        if (!result.success) {
          throw new Error(result.error || '画像の削除に失敗しました')
        }
        return true
      },
      '画像の削除に失敗しました',
      `画像を削除: ${imageId}`,
      false
    )
    return result ?? false
  }

  /** カテゴリーの全画像を取得 */
  const getCategoryImages = async (categoryId: string): Promise<BackgroundImageRecord[]> => {
    const result = await handleImageOperation(
      async () => {
        const result = await dbGetCategoryImages(categoryId)
        if (!result.success) {
          throw new Error(result.error || 'カテゴリー画像の取得に失敗しました')
        }
        return result.data || []
      },
      'カテゴリー画像の取得に失敗しました',
      `カテゴリー画像を取得: ${categoryId}`,
      []
    )
    return result ?? []
  }

  /** カテゴリー名と画像名から画像を取得 */
  const getBackgroundImageByNames = async (categoryName: string, imageName: string): Promise<BackgroundImageRecord | null> => {
    const result = await handleImageOperation(
      async () => {
        const imageResult = await dbGetBackgroundImageByNames(categoryName, imageName)
        if (!imageResult.success) {
          throw new Error(imageResult.error || '背景画像の取得に失敗しました')
        }
        return imageResult.data
      },
      '背景画像の取得に失敗しました',
      `背景画像を取得: ${categoryName}/${imageName}`,
      null
    )
    return result ?? null
  }

  /** 複数ファイル選択で一気にアップロード */
  const bulkUploadImages = async (categoryId: string, files: File[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    return handleBulkOperation(
      async () => {
        let successCount = 0
        let failedCount = 0
        const errors: string[] = []

        for (const file of files) {
          try {
            // ファイル名から画像名を取得（拡張子を除く）
            const imageName = getFileNameWithoutExtension(file.name)

            // useImageUploadでファイルを処理
            const uploadResult = await imageUpload.uploadImage(file)
            if (!uploadResult) {
              failedCount++
              const errorMessage = imageUpload.error.value || '画像の処理に失敗しました'
              errors.push(`${imageName}: ${errorMessage}`)
              logger.warn(`背景画像の処理失敗: ${imageName}`, { component: 'useBackgroundImages' })
              continue
            }

            // Base64データから実際のデータ部分を抽出
            const base64 = uploadResult.base64Data.split(',')[1]
            if (!base64) {
              failedCount++
              errors.push(`${imageName}: 画像データの抽出に失敗しました`)
              logger.warn(`背景画像のデータ抽出失敗: ${imageName}`, { component: 'useBackgroundImages' })
              continue
            }

            const result = await dbUploadBackgroundImage(categoryId, imageName, base64, uploadResult.mimeType, uploadResult.size)

            if (result.success) {
              successCount++
              logger.info(`背景画像をアップロード成功: ${imageName}`, { component: 'useBackgroundImages' })
            } else {
              failedCount++
              errors.push(`${imageName}: ${result.error}`)
              logger.warn(`背景画像のアップロード失敗: ${imageName}`, { component: 'useBackgroundImages' })
            }
          } catch (fileError) {
            failedCount++
            const errorMessage = fileError instanceof Error ? fileError.message : 'ファイル処理エラー'
            errors.push(`${file.name}: ${errorMessage}`)
            logger.error(`ファイル処理エラー: ${file.name}`, { component: 'useBackgroundImages' }, fileError)
          }
        }

        logger.info(`一括アップロード完了: 成功${successCount}件、失敗${failedCount}件`, { component: 'useBackgroundImages' })
        return { success: successCount, failed: failedCount, errors }
      },
      '一括アップロードに失敗しました',
      { success: 0, failed: files.length, errors: ['一括アップロードに失敗しました'] }
    )
  }

  /** カテゴリー別に画像をグループ化して取得 */
  const getImagesGroupedByCategory = async (): Promise<Record<string, BackgroundImageRecord[]>> => {
    const result = await handleImageOperation(
      async () => {
        // 全カテゴリーを取得
        const categoriesResult = await dbGetAllBackgroundCategories()
        if (!categoriesResult.success || !categoriesResult.data) {
          throw new Error(categoriesResult.error || 'カテゴリー一覧の取得に失敗しました')
        }

        // 各カテゴリーの画像を並列で取得（エラーハンドリング付き）
        const results = await Promise.allSettled(
          categoriesResult.data.map(async (category) => ({
            name: category.name,
            images: await getCategoryImages(category.id),
          }))
        )

        // 成功した結果のみを抽出し、画像が存在するカテゴリーのみをグループ化
        const categoryGroups: Record<string, BackgroundImageRecord[]> = Object.fromEntries(
          results
            .filter((result): result is PromiseFulfilledResult<{ name: string; images: BackgroundImageRecord[] }> => result.status === 'fulfilled' && result.value.images.length > 0)
            .map((result) => [result.value.name, result.value.images])
        )

        return categoryGroups
      },
      'カテゴリー別画像の取得に失敗しました',
      'カテゴリー別画像を取得',
      {}
    )
    return result ?? {}
  }

  return {
    // 状態
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // カテゴリー管理
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory,

    // 画像管理
    uploadImage,
    deleteImage,
    getCategoryImages,
    getBackgroundImageByNames,
    bulkUploadImages,
    getImagesGroupedByCategory,

    // ユーティリティ
    clearAllErrors,
  }
}
