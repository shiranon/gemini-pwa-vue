import { readonly, ref } from 'vue'

export interface ImageUploadOptions {
  maxSize?: number // バイト単位
  allowedTypes?: string[]
  quality?: number // 0-1 (JPEG圧縮品質)
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function useImageUpload(options: ImageUploadOptions = {}) {
  const { maxSize = DEFAULT_MAX_SIZE, allowedTypes = DEFAULT_ALLOWED_TYPES } = options

  const isUploading = ref(false)
  const error = ref<string | null>(null)

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

    // ファイル形式チェック
    if (!allowedTypes.includes(file.type)) {
      error.value = 'サポートされていないファイル形式です'
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
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  })
}

export function useBackgroundImageUpload() {
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  })
}

export function useProfileImageUpload() {
  return useImageUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  })
}
