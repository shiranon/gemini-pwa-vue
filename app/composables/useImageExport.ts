import JSZip from 'jszip'
import { readonly, ref } from 'vue'
import { dbGetAllCharacterImages, dbGetAllCharacters, dbGetCharacterImageStats, dbGetAllOutfits } from '~/lib/database'
import type { CharacterImageRecord, CharacterOutfitRecord, CharacterRecord } from '~/types/database'
import { logger } from '~/lib/logger'

/**
 * 画像エクスポート用Composable
 */
export function useImageExport() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const progress = ref(0)

  // ============================================================================
  // データ取得
  // ============================================================================

  /** 画像統計情報を取得 */
  const getImageStats = async () => {
    try {
      isLoading.value = true
      error.value = null

      const result = await dbGetCharacterImageStats()
      if (!result.success) {
        error.value = result.error || '統計情報の取得に失敗しました'
        return null
      }

      return result.data
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '統計情報の取得に失敗しました'
      error.value = errorMsg
      logger.error('画像統計の取得に失敗しました:', { component: 'useImageExport' }, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /** 全画像データを取得 */
  const getAllImageData = async () => {
    try {
      isLoading.value = true
      error.value = null

      const [imagesResult, charactersResult, outfitsResult] = await Promise.all([dbGetAllCharacterImages(), dbGetAllCharacters(), dbGetAllOutfits()])

      if (!imagesResult.success) {
        error.value = imagesResult.error || '画像データの取得に失敗しました'
        return null
      }

      if (!charactersResult.success) {
        error.value = charactersResult.error || 'キャラクターデータの取得に失敗しました'
        return null
      }

      if (!outfitsResult.success) {
        error.value = '衣装データの取得に失敗しました'
        return null
      }

      return {
        images: imagesResult.data!,
        characters: charactersResult.data!,
        outfits: outfitsResult.data!,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'データの取得に失敗しました'
      error.value = errorMsg
      logger.error('画像データの取得に失敗しました:', { component: 'useImageExport' }, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ============================================================================
  // フィルタリング
  // ============================================================================

  /** 画像をフィルタリング */
  const filterImages = (
    images: CharacterImageRecord[],
    characters: CharacterRecord[],
    outfits: CharacterOutfitRecord[],
    filters: {
      characterIds?: string[]
      outfitIds?: string[]
      expressions?: string[]
    }
  ) => {
    return images.filter((image) => {
      // キャラクターフィルタ
      if (filters.characterIds && filters.characterIds.length > 0) {
        if (!filters.characterIds.includes(image.characterId)) {
          return false
        }
      }

      // 衣装フィルタ
      if (filters.outfitIds && filters.outfitIds.length > 0) {
        if (!filters.outfitIds.includes(image.outfitId)) {
          return false
        }
      }

      // 表情フィルタ
      if (filters.expressions && filters.expressions.length > 0) {
        if (!filters.expressions.includes(image.expression)) {
          return false
        }
      }

      return true
    })
  }

  // ============================================================================
  // ZIP生成
  // ============================================================================

  /** 画像をZIPファイルとしてエクスポート */
  const exportImagesAsZip = async (
    images: CharacterImageRecord[],
    characters: CharacterRecord[],
    outfits: CharacterOutfitRecord[],
    options: {
      includeMetadata?: boolean
      folderStructure?: 'flat' | 'hierarchical'
      filename?: string
    } = {}
  ) => {
    try {
      isLoading.value = true
      error.value = null
      progress.value = 0

      const zip = new JSZip()
      const { includeMetadata = true, folderStructure = 'hierarchical', filename = 'character-images' } = options

      // メタデータファイルを作成
      if (includeMetadata) {
        const metadata = {
          exportedAt: new Date().toISOString(),
          totalImages: images.length,
          characters: characters.map((char) => ({
            id: char.id,
            name: char.name,
            description: char.description,
          })),
          outfits: outfits.map((outfit) => ({
            id: outfit.id,
            characterId: outfit.characterId,
            name: outfit.name,
            description: outfit.description,
          })),
          images: images.map((img) => ({
            id: img.id,
            characterId: img.characterId,
            outfitId: img.outfitId,
            expression: img.expression,
            mimeType: img.mimeType,
            size: img.size,
            createdAt: img.createdAt,
          })),
        }

        zip.file('metadata.json', JSON.stringify(metadata, null, 2))
      }

      // 画像ファイルを追加
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        if (!image) continue

        const character = characters.find((c) => c.id === image.characterId)
        const outfit = outfits.find((o) => o.id === image.outfitId)

        if (!character || !outfit) {
          logger.warn('キャラクターまたは衣装が見つかりません:', {
            component: 'useImageExport',
            imageId: image.id,
            characterId: image.characterId,
            outfitId: image.outfitId,
          })
          continue
        }

        // ファイル名を生成
        const extension = image.mimeType.split('/')[1] || 'png'
        const safeCharacterName = sanitizeFilename(character.name)
        const safeOutfitName = sanitizeFilename(outfit.name)
        const safeExpression = sanitizeFilename(image.expression)

        let filePath: string
        if (folderStructure === 'hierarchical') {
          filePath = `${safeCharacterName}/${safeOutfitName}/${safeExpression}.${extension}`
        } else {
          filePath = `${safeCharacterName}_${safeOutfitName}_${safeExpression}.${extension}`
        }

        // Base64データをBlobに変換
        const base64Data = image.base64Data.startsWith('data:') ? image.base64Data.split(',')[1] : image.base64Data

        if (base64Data) {
          zip.file(filePath, base64Data, { base64: true })
        }

        // 進捗を更新
        progress.value = Math.round(((i + 1) / images.length) * 100)
      }

      // ZIPファイルを生成
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // ダウンロード
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      logger.info(`画像エクスポート完了: ${images.length}件の画像をZIPファイルに出力`, {
        component: 'useImageExport',
      })

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ZIPファイルの生成に失敗しました'
      error.value = errorMsg
      logger.error('画像エクスポートに失敗しました:', { component: 'useImageExport' }, err)
      return false
    } finally {
      isLoading.value = false
      progress.value = 0
    }
  }

  // ============================================================================
  // ユーティリティ
  // ============================================================================

  /** ファイル名を安全な文字に変換 */
  const sanitizeFilename = (filename: string): string => {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // 無効な文字を置換
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .replace(/_+/g, '_') // 連続するアンダースコアを1つに
      .replace(/^_|_$/g, '') // 先頭と末尾のアンダースコアを削除
  }

  /** ファイルサイズをフォーマット */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return {
    // 状態
    isLoading: readonly(isLoading),
    error: readonly(error),
    progress: readonly(progress),

    // メソッド
    getImageStats,
    getAllImageData,
    filterImages,
    exportImagesAsZip,
    sanitizeFilename,
    formatFileSize,
  }
}
