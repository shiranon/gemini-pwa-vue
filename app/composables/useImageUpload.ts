import { readonly, ref } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import type { AttachedFile } from '~/types/chat'
import { useImageOptimization, type ImageOptimizationOptions } from './useImageOptimization'

export interface ImageUploadOptions {
  maxSize?: number // バイト単位
  allowedTypes?: string[]
  quality?: number // 0-1 (JPEG圧縮品質)
  enableOptimization?: boolean // 画像最適化を有効にするか
  optimizationOptions?: ImageOptimizationOptions // 最適化オプション
}

export interface ImageUploadResult {
  base64Data: string
  file: File
  mimeType: string
  size: number
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']

/**
 * FileまたはAttachedFileを処理して画像データを取得する共通関数
 * @param file - FileオブジェクトまたはAttachedFile
 * @param uploadImage - useImageUploadのuploadImage関数
 * @returns Base64データ、MIMEタイプ、サイズ
 */
export async function processFileOrAttachedFile(
  file: File | AttachedFile,
  uploadImage: (file: File) => Promise<ImageUploadResult | null>
): Promise<{ base64Data: string; mimeType: string; size: number; base64: string }> {
  let base64Data: string
  let mimeType: string
  let size: number

  // FileオブジェクトかAttachedFileかで処理を分岐
  if (file instanceof File) {
    // useImageUploadでファイルを処理
    const uploadResult = await uploadImage(file)
    if (!uploadResult) {
      throw new Error('画像の処理に失敗しました')
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

  return { base64Data, mimeType, size, base64 }
}

export function useImageUpload(options: ImageUploadOptions = {}) {
  const { maxSize = DEFAULT_MAX_SIZE, allowedTypes = DEFAULT_ALLOWED_TYPES, enableOptimization = true, optimizationOptions = {} } = options

  const isUploading = ref(false)
  const error = ref<string | null>(null)
  const { optimizeImage, isProcessing: isOptimizing } = useImageOptimization()

  const uploadImage = async (file: File): Promise<ImageUploadResult | null> => {
    if (!file) {
      error.value = 'ファイルが選択されていません'
      return null
    }

    let processedFile = file

    // 画像最適化処理
    if (enableOptimization) {
      const optimizationResult = await optimizeImage(file, optimizationOptions)
      if (optimizationResult) {
        processedFile = optimizationResult.file
      } else {
        error.value = '画像の最適化に失敗しました'
        return null
      }
    }

    // ファイルサイズチェック（最適化後）
    if (processedFile.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024)
      error.value = `ファイルサイズが${maxSizeMB}MBを超えています`
      return null
    }

    // ファイル形式チェック（最適化後のファイルで）
    const fileExtension = processedFile.name.toLowerCase().split('.').pop()
    const isValidMimeType = allowedTypes.includes(processedFile.type)
    const isValidExtension = fileExtension && ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'].includes(fileExtension)

    if (!isValidMimeType && !isValidExtension) {
      error.value = `サポートされていないファイル形式です (MIME: ${processedFile.type}, 拡張子: ${fileExtension})`
      return null
    }

    try {
      isUploading.value = true
      error.value = null

      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
          const result = reader.result
          if (typeof result === 'string') {
            // Base64エンコード後のサイズ制限（元ファイルサイズの約1.33倍 + 余裕を持って1.5倍）
            const base64SizeLimit = maxSize * 1.5
            if (result.length > base64SizeLimit) {
              reject(new Error('エンコード後のファイルサイズが上限を超えています'))
              return
            }

            resolve({
              base64Data: result,
              file: processedFile,
              mimeType: processedFile.type,
              size: processedFile.size,
            })
          } else {
            reject(new Error('ファイルの読み込みに失敗しました'))
          }
        }

        reader.onerror = () => {
          reject(new Error('ファイルの読み込み中にエラーが発生しました'))
        }

        reader.readAsDataURL(processedFile)
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'アップロードに失敗しました'
      return null
    } finally {
      isUploading.value = false
    }
  }

  const handleFileInput = async (event: Event): Promise<string | null> => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return null

    const result = await uploadImage(file)

    // エラーがあった場合はinputをクリア
    if (!result) {
      target.value = ''
    }

    return result?.base64Data ?? null
  }

  const removeImage = () => {
    error.value = null
    return null
  }

  const clearError = () => {
    error.value = null
  }

  const selectFile = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = allowedTypes.join(',')
      input.onchange = async (event) => {
        const result = await handleFileInput(event)
        resolve(result)
      }
      input.oncancel = () => {
        resolve(null)
      }
      input.click()
    })
  }

  return {
    isUploading: readonly(isUploading),
    isOptimizing: readonly(isOptimizing),
    error: readonly(error),
    uploadImage,
    handleFileInput,
    selectFile,
    removeImage,
    clearError,
    maxSize,
    allowedTypes,
    enableOptimization,
  }
}

// 特定用途向けのプリセット（設定に基づいて最適化を有効化）
export function useAvatarImageUpload() {
  const settingsStore = useSettingsStore()
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
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
}

export function useBackgroundImageUpload() {
  const settingsStore = useSettingsStore()
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
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
}

export function useProfileImageUpload() {
  const settingsStore = useSettingsStore()
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
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
}
