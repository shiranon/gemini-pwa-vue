import { ref } from 'vue'
import { logger } from '~/utils/logger'

// File System Access API の型定義
interface FileSystemDirectoryHandle {
  name: string
  kind: 'directory'
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
}

interface FileSystemFileHandle {
  name: string
  kind: 'file'
  getFile(): Promise<File>
}

type FileSystemHandle = FileSystemDirectoryHandle | FileSystemFileHandle

interface FileSystemAccessAPI {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
}

export interface FolderStructure {
  characterName: string
  outfits: OutfitStructure[]
}

export interface OutfitStructure {
  outfitName: string
  images: File[]
}

export interface BulkUploadProgress {
  totalFiles: number
  processedFiles: number
  currentFile: string
  isComplete: boolean
  errors: string[]
}

export function useFolderUpload() {
  const isSupported = ref(false)
  const progress = ref<BulkUploadProgress>({
    totalFiles: 0,
    processedFiles: 0,
    currentFile: '',
    isComplete: false,
    errors: [],
  })

  // File System Access APIのサポート確認
  const checkSupport = () => {
    isSupported.value = 'showDirectoryPicker' in window
    return isSupported.value
  }

  // フォルダを選択して構造を解析
  const selectFolder = async (): Promise<FolderStructure | null> => {
    if (!checkSupport()) {
      throw new Error('このブラウザはフォルダ選択をサポートしていません')
    }

    try {
      const directoryHandle = await (window as unknown as FileSystemAccessAPI).showDirectoryPicker({
        mode: 'read',
      })

      const structure = await analyzeFolderStructure(directoryHandle)
      return structure
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // ユーザーがキャンセルした場合
        return null
      }
      logger.error('フォルダ選択に失敗', { component: 'useFolderUpload' }, error)
      throw error
    }
  }

  // フォルダ構造を解析
  const analyzeFolderStructure = async (directoryHandle: FileSystemDirectoryHandle): Promise<FolderStructure> => {
    const characterName = directoryHandle.name
    const outfits: OutfitStructure[] = []

    // ディレクトリ内のエントリを取得
    for await (const [, handle] of directoryHandle.entries()) {
      if (handle.kind === 'directory') {
        // 衣装フォルダとして処理
        const outfit = await analyzeOutfitFolder(handle as FileSystemDirectoryHandle)
        if (outfit.images.length > 0) {
          outfits.push(outfit)
        }
      }
    }

    return {
      characterName,
      outfits,
    }
  }

  // 衣装フォルダを解析
  const analyzeOutfitFolder = async (outfitHandle: FileSystemDirectoryHandle): Promise<OutfitStructure> => {
    const outfitName = outfitHandle.name
    const images: File[] = []

    // 画像ファイルの拡張子
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']

    for await (const [name, handle] of outfitHandle.entries()) {
      if (handle.kind === 'file') {
        const extension = name.toLowerCase().substring(name.lastIndexOf('.'))
        if (imageExtensions.includes(extension)) {
          try {
            const file = await (handle as FileSystemFileHandle).getFile()
            images.push(file)
          } catch (error) {
            logger.warn(`ファイルの読み込みに失敗: ${name}`, { component: 'useFolderUpload' }, error)
          }
        }
      }
    }

    return {
      outfitName,
      images,
    }
  }

  // 一括アップロードの進捗をリセット
  const resetProgress = () => {
    progress.value = {
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      isComplete: false,
      errors: [],
    }
  }

  // 進捗を更新
  const updateProgress = (currentFile: string, processedFiles: number, totalFiles: number) => {
    progress.value.currentFile = currentFile
    progress.value.processedFiles = processedFiles
    progress.value.totalFiles = totalFiles
    progress.value.isComplete = processedFiles >= totalFiles
  }

  // エラーを追加
  const addError = (error: string) => {
    progress.value.errors.push(error)
  }

  return {
    isSupported,
    progress: readonly(progress),
    checkSupport,
    selectFolder,
    resetProgress,
    updateProgress,
    addError,
  }
}
