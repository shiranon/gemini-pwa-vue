import { computed, ref } from 'vue'
import { useImageUpload } from '~/composables/useImageUpload'
import { IMAGE_LIMITS } from '~/constants/constants'
import {
  dbCreateCharacter,
  dbCreateCharacterOutfit,
  dbDeleteCharacter,
  dbDeleteCharacterImage,
  dbDeleteCharacterOutfit,
  dbGetAllCharacters,
  dbGetCharacterImageByNames,
  dbGetCharacterOutfits,
  dbGetOutfitImages,
  dbUpdateCharacter,
  dbUpdateCharacterOutfit,
  dbUploadCharacterImage,
} from '~/lib/database'
import type { CharacterImageRecord, CharacterOutfitRecord, CharacterRecord, DatabaseOperationResult } from '~/types/database'
import { logger } from '~/utils/logger'

/**
 * キャラクター画像管理Composable
 */
export function useCharacterImages() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 画像アップロード機能
  const imageUpload = useImageUpload({
    maxSize: IMAGE_LIMITS.MAX_FILE_SIZE,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
  })

  // ============================================================================
  // 共通ユーティリティ
  // ============================================================================

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
        logger.info(successLog, { component: 'useCharacterImages' })
      }
      return result.data!
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage
      error.value = errorMsg
      logger.error(errorMessage, { component: 'useCharacterImages' }, err)
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
        logger.info(successLog, { component: 'useCharacterImages' })
      }
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage
      error.value = errorMsg
      logger.error(errorMessage, { component: 'useCharacterImages' }, err)
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
      logger.error(errorMessage, { component: 'useCharacterImages' }, err)
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
  // キャラクター管理
  // ============================================================================

  /** キャラクターを作成 */
  const createCharacter = async (name: string, description?: string): Promise<CharacterRecord | null> => {
    return handleDatabaseOperation(() => dbCreateCharacter(name, description), 'キャラクターの作成に失敗しました', `キャラクターを作成: ${name}`)
  }

  /** 全キャラクターを取得 */
  const getCharacters = async (): Promise<CharacterRecord[]> => {
    const result = await handleDatabaseOperation(() => dbGetAllCharacters(), 'キャラクター一覧の取得に失敗しました')
    return result || []
  }

  /** キャラクターを更新 */
  const updateCharacter = async (id: string, updates: Partial<Pick<CharacterRecord, 'name' | 'description'>>): Promise<CharacterRecord | null> => {
    return handleDatabaseOperation(() => dbUpdateCharacter(id, updates), 'キャラクターの更新に失敗しました', `キャラクターを更新: ${id}`)
  }

  /** キャラクターを削除 */
  const deleteCharacter = async (id: string): Promise<boolean> => {
    const result = await handleDatabaseOperation(() => dbDeleteCharacter(id), 'キャラクターの削除に失敗しました', `キャラクターを削除: ${id}`)
    return result !== null
  }

  // ============================================================================
  // 衣装管理
  // ============================================================================

  /** 衣装を作成 */
  const createOutfit = async (characterId: string, name: string, description?: string): Promise<CharacterOutfitRecord | null> => {
    return handleDatabaseOperation(() => dbCreateCharacterOutfit(characterId, name, description), '衣装の作成に失敗しました', `衣装を作成: ${name}`)
  }

  /** キャラクターの衣装一覧を取得 */
  const getOutfits = async (characterId: string): Promise<CharacterOutfitRecord[]> => {
    const result = await handleDatabaseOperation(() => dbGetCharacterOutfits(characterId), '衣装一覧の取得に失敗しました')
    return result || []
  }

  /** 衣装を更新 */
  const updateOutfit = async (id: string, updates: Partial<Pick<CharacterOutfitRecord, 'name' | 'description'>>): Promise<CharacterOutfitRecord | null> => {
    return handleDatabaseOperation(() => dbUpdateCharacterOutfit(id, updates), '衣装の更新に失敗しました', `衣装を更新: ${id}`)
  }

  /** 衣装を削除 */
  const deleteOutfit = async (id: string): Promise<boolean> => {
    const result = await handleDatabaseOperation(() => dbDeleteCharacterOutfit(id), '衣装の削除に失敗しました', `衣装を削除: ${id}`)
    return result !== null
  }

  // ============================================================================
  // 画像管理
  // ============================================================================

  /** 画像をアップロード */
  const uploadImage = async (characterId: string, outfitId: string, expression: string, file: File | import('~/types/chat').AttachedFile): Promise<CharacterImageRecord | null> => {
    return handleImageOperation(
      async () => {
        let base64Data: string
        let mimeType: string
        let size: number

        // FileオブジェクトかAttachedFileかで処理を分岐
        if (file instanceof File) {
          // useImageUploadでファイルを処理
          const processedData = await imageUpload.uploadImage(file)
          if (!processedData) {
            throw new Error(imageUpload.error.value || '画像の処理に失敗しました')
          }
          base64Data = processedData
          mimeType = file.type
          size = file.size
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

        const result = await dbUploadCharacterImage(characterId, outfitId, expression, base64, mimeType, size)
        if (!result.success) {
          throw new Error(result.error || '画像のアップロードに失敗しました')
        }

        return result.data!
      },
      '画像のアップロードに失敗しました',
      `画像をアップロード: ${expression}`
    )
  }

  /** 画像を削除 */
  const deleteImage = async (imageId: string): Promise<boolean> => {
    const result = await handleImageOperation(
      async () => {
        const result = await dbDeleteCharacterImage(imageId)
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

  /** キャラクターの全てのexpression画像を取得 */
  const getCharacterAllExpressions = async (characterId: string): Promise<CharacterImageRecord[]> => {
    const result = await handleImageOperation(
      async () => {
        // キャラクターの全衣装を取得
        const outfitsResult = await dbGetCharacterOutfits(characterId)
        if (!outfitsResult.success || !outfitsResult.data) {
          throw new Error(outfitsResult.error || '衣装の取得に失敗しました')
        }

        // 各衣装の画像を取得
        const allImages: CharacterImageRecord[] = []
        for (const outfit of outfitsResult.data) {
          const imagesResult = await dbGetOutfitImages(characterId, outfit.id)
          if (imagesResult.success && imagesResult.data) {
            allImages.push(...imagesResult.data)
          }
        }

        return allImages
      },
      'キャラクターの表情画像取得に失敗しました',
      `キャラクターの全表情画像を取得: ${characterId}`,
      []
    )
    return result ?? []
  }

  /** キャラクターの衣装の全てのexpression画像を取得 */
  const getOutfitAllExpressions = async (characterId: string, outfitId: string): Promise<CharacterImageRecord[]> => {
    const result = await handleImageOperation(
      async () => {
        const result = await dbGetOutfitImages(characterId, outfitId)
        if (!result.success) {
          throw new Error(result.error || '衣装の表情画像取得に失敗しました')
        }
        return result.data || []
      },
      '衣装の表情画像取得に失敗しました',
      `衣装の全表情画像を取得: ${outfitId}`,
      []
    )
    return result ?? []
  }

  /** 指定したexpression画像を削除 */
  const deleteExpressionImage = async (characterId: string, outfitId: string, expression: string): Promise<boolean> => {
    const result = await handleImageOperation(
      async () => {
        // 該当する画像を検索
        const imagesResult = await dbGetOutfitImages(characterId, outfitId)
        if (!imagesResult.success || !imagesResult.data) {
          throw new Error(imagesResult.error || '画像の検索に失敗しました')
        }

        const targetImage = imagesResult.data.find((img) => img.expression === expression)
        if (!targetImage) {
          throw new Error('指定された表情の画像が見つかりません')
        }

        const result = await dbDeleteCharacterImage(targetImage.id)
        if (!result.success) {
          throw new Error(result.error || '画像の削除に失敗しました')
        }

        return true
      },
      '表情画像の削除に失敗しました',
      `表情画像を削除: ${expression}`,
      false
    )
    return result ?? false
  }

  /** 複数ファイル選択で一気にアップロード */
  const bulkUploadExpressions = async (characterId: string, outfitId: string, files: File[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    return handleBulkOperation(
      async () => {
        let successCount = 0
        let failedCount = 0
        const errors: string[] = []

        for (const file of files) {
          try {
            // ファイル名から表情名を取得（拡張子を除く）
            const expression = file.name.replace(/\.[^/.]+$/, '')

            // useImageUploadでファイルを処理
            const base64Data = await imageUpload.uploadImage(file)
            if (!base64Data) {
              failedCount++
              const errorMessage = imageUpload.error.value || '画像の処理に失敗しました'
              errors.push(`${expression}: ${errorMessage}`)
              logger.warn(`表情画像の処理失敗: ${expression}`, { component: 'useCharacterImages' })
              continue
            }

            // Base64データから実際のデータ部分を抽出
            const base64 = base64Data.split(',')[1]
            if (!base64) {
              failedCount++
              errors.push(`${expression}: 画像データの抽出に失敗しました`)
              logger.warn(`表情画像のデータ抽出失敗: ${expression}`, { component: 'useCharacterImages' })
              continue
            }

            const result = await dbUploadCharacterImage(characterId, outfitId, expression, base64, file.type, file.size)

            if (result.success) {
              successCount++
              logger.info(`表情画像をアップロード成功: ${expression}`, { component: 'useCharacterImages' })
            } else {
              failedCount++
              errors.push(`${expression}: ${result.error}`)
              logger.warn(`表情画像のアップロード失敗: ${expression}`, { component: 'useCharacterImages' })
            }
          } catch (fileError) {
            failedCount++
            const errorMessage = fileError instanceof Error ? fileError.message : 'ファイル処理エラー'
            errors.push(`${file.name}: ${errorMessage}`)
            logger.error(`ファイル処理エラー: ${file.name}`, { component: 'useCharacterImages' }, fileError)
          }
        }

        logger.info(`一括アップロード完了: 成功${successCount}件、失敗${failedCount}件`, { component: 'useCharacterImages' })
        return { success: successCount, failed: failedCount, errors }
      },
      '一括アップロードに失敗しました',
      { success: 0, failed: files.length, errors: ['一括アップロードに失敗しました'] }
    )
  }

  /** キャラクターの最初の画像を取得 */
  const getCharacterFirstImage = async (characterId: string): Promise<CharacterImageRecord | null> => {
    const result = await handleImageOperation(
      async () => {
        // キャラクターの全画像を取得
        const images = await getCharacterAllExpressions(characterId)

        if (images.length === 0) {
          return null
        }

        // 作成日時でソートして最初の画像を返す
        const sortedImages = images.sort((a, b) => a.createdAt - b.createdAt)
        return sortedImages[0]
      },
      'キャラクターの最初の画像取得に失敗しました',
      `キャラクターの最初の画像を取得: ${characterId}`,
      null
    )
    return result ?? null
  }

  /** キャラクター名、衣装名、表情から画像を取得（最適化版） */
  const getCharacterImageByNames = async (characterName: string, outfitName: string, expression: string): Promise<CharacterImageRecord | null> => {
    const result = await handleImageOperation(
      async () => {
        // 最適化されたデータベース関数を使用
        const imageResult = await dbGetCharacterImageByNames(characterName, outfitName, expression)
        if (!imageResult.success) {
          throw new Error(imageResult.error || 'キャラクター画像の取得に失敗しました')
        }
        return imageResult.data
      },
      'キャラクター画像の取得に失敗しました',
      `キャラクター画像を取得: ${characterName}/${outfitName}/${expression}`,
      null
    )
    return result ?? null
  }

  /** キャラクター別に画像をグループ化して取得 */
  const getImagesGroupedByCharacter = async (): Promise<Record<string, CharacterImageRecord[]>> => {
    const result = await handleImageOperation(
      async () => {
        // 全キャラクターを取得
        const charactersResult = await dbGetAllCharacters()
        if (!charactersResult.success || !charactersResult.data) {
          throw new Error(charactersResult.error || 'キャラクター一覧の取得に失敗しました')
        }

        const characterGroups: Record<string, CharacterImageRecord[]> = {}

        // 各キャラクターの画像を取得
        for (const character of charactersResult.data) {
          const images = await getCharacterAllExpressions(character.id)
          if (images.length > 0) {
            characterGroups[character.name] = images
          }
        }

        return characterGroups
      },
      'キャラクター別画像の取得に失敗しました',
      'キャラクター別画像を取得',
      {}
    )
    return result ?? {}
  }

  return {
    // 状態
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // キャラクター管理
    createCharacter,
    getCharacters,
    updateCharacter,
    deleteCharacter,

    // 衣装管理
    createOutfit,
    getOutfits,
    updateOutfit,
    deleteOutfit,

    // 画像管理
    uploadImage,
    deleteImage,

    // 要求された機能
    getCharacterAllExpressions,
    getOutfitAllExpressions,
    deleteExpressionImage,
    bulkUploadExpressions,
    getImagesGroupedByCharacter,
    getCharacterFirstImage,
    getCharacterImageByNames,

    // ユーティリティ
    clearAllErrors,
  }
}
