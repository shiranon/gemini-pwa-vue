import type { useImageUpload } from '~/composables/useImageUpload'
import { logger } from '~/lib/logger'

/**
 * 画像の一括アップロード処理の共通ロジック
 */

/** ファイル名から拡張子を除いた名前を取得 */
export const getFileNameWithoutExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return filename
  }
  return filename.substring(0, lastDotIndex)
}

/** データベースアップロード関数の型 */
export type DbUploadFunction = (imageName: string, base64: string, mimeType: string, size: number) => Promise<{ success: boolean; error?: string }>

/** 一括アップロード結果の型 */
export interface BulkUploadResult {
  success: number
  failed: number
  errors: string[]
}

/** 衣装アップロードデータの型 */
export interface OutfitUploadData {
  outfitName: string
  images: File[]
}

/** 衣装作成関数の型 */
export type CreateOutfitFunction = (characterId: string, outfitName: string) => Promise<{ id: string } | null>

/** 画像一括アップロード関数の型 */
export type UploadImagesFunction = (characterId: string, outfitId: string, files: File[]) => Promise<BulkUploadResult>

/**
 * 画像一括アップロード処理を生成するファクトリー関数
 *
 * @param imageUpload - useImageUpload composableのインスタンス
 * @param dbUploadFn - データベースアップロード関数
 * @param componentName - ログ出力用のコンポーネント名
 * @returns 一括アップロード処理を実行する関数
 */
export const createBulkImageUploader = (imageUpload: ReturnType<typeof useImageUpload>, dbUploadFn: DbUploadFunction, componentName: string) => {
  return async (files: File[]): Promise<BulkUploadResult> => {
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
          logger.warn(`画像の処理失敗: ${imageName}`, { component: componentName })
          continue
        }

        // Base64データから実際のデータ部分を抽出
        const base64 = uploadResult.base64Data.split(',')[1]
        if (!base64) {
          failedCount++
          errors.push(`${imageName}: 画像データの抽出に失敗しました`)
          logger.warn(`画像のデータ抽出失敗: ${imageName}`, { component: componentName })
          continue
        }

        const result = await dbUploadFn(imageName, base64, uploadResult.mimeType, uploadResult.size)

        if (result.success) {
          successCount++
          logger.info(`画像をアップロード成功: ${imageName}`, { component: componentName })
        } else {
          failedCount++
          errors.push(`${imageName}: ${result.error}`)
          logger.warn(`画像のアップロード失敗: ${imageName}`, { component: componentName })
        }
      } catch (fileError) {
        failedCount++
        const errorMessage = fileError instanceof Error ? fileError.message : 'ファイル処理エラー'
        errors.push(`${file.name}: ${errorMessage}`)
        logger.error(`ファイル処理エラー: ${file.name}`, { component: componentName }, fileError)
      }
    }

    logger.info(`一括アップロード完了: 成功${successCount}件、失敗${failedCount}件`, { component: componentName })
    return { success: successCount, failed: failedCount, errors }
  }
}

/**
 * 衣装と画像の一括アップロード処理を生成するファクトリー関数
 *
 * @param createOutfit - 衣装作成関数
 * @param uploadImages - 画像一括アップロード関数
 * @param componentName - ログ出力用のコンポーネント名
 * @returns 衣装と画像の一括アップロード処理を実行する関数
 */
export const createBulkOutfitUploader = (createOutfit: CreateOutfitFunction, uploadImages: UploadImagesFunction, componentName: string) => {
  return async (characterId: string, outfits: OutfitUploadData[]): Promise<BulkUploadResult> => {
    let totalSuccess = 0
    let totalFailed = 0
    const allErrors: string[] = []

    for (const outfitData of outfits) {
      try {
        // 衣装を作成
        const outfit = await createOutfit(characterId, outfitData.outfitName)
        if (!outfit) {
          allErrors.push(`衣装「${outfitData.outfitName}」の作成に失敗しました`)
          totalFailed += outfitData.images.length
          continue
        }

        // 画像を一括アップロード
        const result = await uploadImages(characterId, outfit.id, outfitData.images)
        totalSuccess += result.success
        totalFailed += result.failed
        allErrors.push(...result.errors.map((error) => `衣装「${outfitData.outfitName}」: ${error}`))
      } catch (outfitError) {
        const errorMessage = outfitError instanceof Error ? outfitError.message : '衣装処理エラー'
        allErrors.push(`衣装「${outfitData.outfitName}」: ${errorMessage}`)
        totalFailed += outfitData.images.length
        logger.error(`衣装処理エラー: ${outfitData.outfitName}`, { component: componentName }, outfitError)
      }
    }

    logger.info(`衣装一括処理完了: 成功${totalSuccess}件、失敗${totalFailed}件`, { component: componentName })
    return { success: totalSuccess, failed: totalFailed, errors: allErrors }
  }
}
