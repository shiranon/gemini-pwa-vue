import { ref, computed } from 'vue'
import { db } from '~/lib/database'
import type { CharacterImageAssetRecord } from '~/types/database'
import { generateFileId } from '~/lib/ids'
import { logger } from '~/utils/logger'

export function useCharacterImages() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 全画像を取得
  const getAllImages = async (): Promise<CharacterImageAssetRecord[]> => {
    try {
      isLoading.value = true
      error.value = null

      const images = await db.characterImageAssets.orderBy('createdAt').reverse().toArray()

      logger.info(`キャラクター画像を取得: ${images.length}件`, {
        component: 'useCharacterImages',
      })
      return images
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像の取得に失敗しました'
      error.value = errorMessage
      logger.error('キャラクター画像の取得に失敗:', { component: 'useCharacterImages' }, err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // キャラクター別に画像を取得
  const getImagesByCharacter = async (character: string): Promise<CharacterImageAssetRecord[]> => {
    try {
      isLoading.value = true
      error.value = null

      const images = await db.characterImageAssets.where('character').equals(character).reverse().sortBy('createdAt')

      return images
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像の取得に失敗しました'
      error.value = errorMessage
      logger.error('キャラクター画像の取得に失敗:', { component: 'useCharacterImages' }, err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // 特定の画像を取得（character + cloth + expression）
  const getCharacterImage = async (character: string, cloth: string, expression: string): Promise<CharacterImageAssetRecord | null> => {
    try {
      const image = await db.characterImageAssets.where('[character+cloth+expression]').equals([character, cloth, expression]).first()

      return image || null
    } catch (err) {
      logger.error('キャラクター画像の取得に失敗:', { component: 'useCharacterImages' }, err)
      return null
    }
  }

  // 利用可能なキャラクター一覧を取得
  const getAvailableCharacters = async (): Promise<string[]> => {
    try {
      const characters = await db.characterImageAssets.orderBy('character').uniqueKeys()

      return characters as string[]
    } catch (err) {
      logger.error('キャラクター一覧の取得に失敗:', { component: 'useCharacterImages' }, err)
      return []
    }
  }

  // 利用可能な服装一覧を取得
  const getAvailableClothes = async (): Promise<string[]> => {
    try {
      const clothes = await db.characterImageAssets.orderBy('cloth').uniqueKeys()

      return clothes as string[]
    } catch (err) {
      logger.error('服装一覧の取得に失敗:', { component: 'useCharacterImages' }, err)
      return []
    }
  }

  // 利用可能な表情一覧を取得
  const getAvailableExpressions = async (): Promise<string[]> => {
    try {
      const expressions = await db.characterImageAssets.orderBy('expression').uniqueKeys()

      return expressions as string[]
    } catch (err) {
      logger.error('表情一覧の取得に失敗:', { component: 'useCharacterImages' }, err)
      return []
    }
  }

  // 画像をアップロード
  const uploadImage = async (character: string, cloth: string, expression: string, base64Data: string, mimeType: string, size: number): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null

      // 既存の画像があるかチェック
      const existingImage = await getCharacterImage(character, cloth, expression)
      if (existingImage) {
        error.value = '同じキャラクター、服装、表情の組み合わせの画像が既に存在します'
        return false
      }

      const imageRecord: CharacterImageAssetRecord = {
        id: generateFileId(),
        character,
        cloth,
        expression,
        base64Data,
        mimeType,
        size,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await db.characterImageAssets.add(imageRecord)

      logger.info(`キャラクター画像をアップロード: ${character}_${cloth}_${expression}`, { component: 'useCharacterImages' })
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像のアップロードに失敗しました'
      error.value = errorMessage
      logger.error('キャラクター画像のアップロードに失敗:', { component: 'useCharacterImages' }, err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 画像を削除
  const deleteImage = async (imageId: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null

      await db.characterImageAssets.delete(imageId)

      logger.info(`キャラクター画像を削除: ${imageId}`, {
        component: 'useCharacterImages',
      })
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像の削除に失敗しました'
      error.value = errorMessage
      logger.error('キャラクター画像の削除に失敗:', { component: 'useCharacterImages' }, err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 画像を更新
  const updateImage = async (imageId: string, updates: Partial<Pick<CharacterImageAssetRecord, 'character' | 'cloth' | 'expression'>>): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null

      await db.characterImageAssets.update(imageId, {
        ...updates,
        updatedAt: Date.now(),
      })

      logger.info(`キャラクター画像を更新: ${imageId}`, {
        component: 'useCharacterImages',
      })
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像の更新に失敗しました'
      error.value = errorMessage
      logger.error('キャラクター画像の更新に失敗:', { component: 'useCharacterImages' }, err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // キャラクター別にグループ化された画像を取得
  const getImagesGroupedByCharacter = async (): Promise<Record<string, CharacterImageAssetRecord[]>> => {
    try {
      const allImages = await getAllImages()
      const grouped: Record<string, CharacterImageAssetRecord[]> = {}

      for (const image of allImages) {
        if (!grouped[image.character]) {
          grouped[image.character] = []
        }
        grouped[image.character]!.push(image)
      }

      return grouped
    } catch (err) {
      logger.error('キャラクター別画像の取得に失敗:', { component: 'useCharacterImages' }, err)
      return {}
    }
  }

  return {
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    getAllImages,
    getImagesByCharacter,
    getCharacterImage,
    getAvailableCharacters,
    getAvailableClothes,
    getAvailableExpressions,
    uploadImage,
    deleteImage,
    updateImage,
    getImagesGroupedByCharacter,
  }
}
