import { readonly, ref } from 'vue'
import { useStorageQuota } from './useStorageQuota'

export interface ImageUploadOptions {
  maxSize?: number // バイト単位
  allowedTypes?: string[]
  quality?: number // 0-1 (JPEG圧縮品質)
  checkStorageQuota?: boolean // ストレージクォータをチェックするか
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']

export function useImageUpload(options: ImageUploadOptions = {}) {
  const { maxSize = DEFAULT_MAX_SIZE, allowedTypes = DEFAULT_ALLOWED_TYPES, checkStorageQuota = true } = options

  const isUploading = ref(false)
  const error = ref<string | null>(null)
  const { checkStorageCapacity, estimateBase64Size, calculateBase64Size } = useStorageQuota()

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) {
      error.value = 'ファイルが選択されていません'
      return null
    }

    // ファイルサイズチェック
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024)
      error.value = `ファイルサイズが${maxSizeMB}MBを超えています`
      return null
    }

    // ストレージクォータチェック（オプション）
    if (checkStorageQuota) {
      const estimatedBase64Size = estimateBase64Size(file.size)
      const capacityCheck = await checkStorageCapacity(estimatedBase64Size)

      if (!capacityCheck.canAdd) {
        error.value = capacityCheck.warning?.message || 'ストレージ容量が不足しています'
        return null
      }

      // 警告がある場合はログに記録
      if (capacityCheck.warning) {
        console.warn('ストレージ容量警告:', capacityCheck.warning.message)
      }
    }

    // ファイル形式チェック
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const isValidMimeType = allowedTypes.includes(file.type)
    const isValidExtension = fileExtension && ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'].includes(fileExtension)

    // デバッグ用ログ
    console.log('File upload debug:', {
      fileName: file.name,
      fileType: file.type,
      fileExtension,
      isValidMimeType,
      isValidExtension,
      allowedTypes,
    })

    if (!isValidMimeType && !isValidExtension) {
      error.value = `サポートされていないファイル形式です (MIME: ${file.type}, 拡張子: ${fileExtension})`
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

            // 実際のBase64データサイズを計算して検証
            const actualBase64Size = calculateBase64Size(result)
            if (actualBase64Size > maxSize * 1.5) {
              reject(new Error('Base64エンコード後の実際のサイズが上限を超えています'))
              return
            }

            resolve(result)
          } else {
            reject(new Error('ファイルの読み込みに失敗しました'))
          }
        }

        reader.onerror = () => {
          reject(new Error('ファイルの読み込み中にエラーが発生しました'))
        }

        reader.readAsDataURL(file)
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

    return result
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
    error: readonly(error),
    uploadImage,
    handleFileInput,
    selectFile,
    removeImage,
    clearError,
    maxSize,
    allowedTypes,
  }
}

// 特定用途向けのプリセット
export function useAvatarImageUpload() {
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
  })
}

export function useBackgroundImageUpload() {
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
  })
}

export function useProfileImageUpload() {
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
  })
}
