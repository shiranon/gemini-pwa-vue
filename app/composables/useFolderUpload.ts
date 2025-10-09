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

export function useFolderUpload() {
  const isSupported = ref(false)

  // File System Access APIのサポート確認
  const checkSupport = () => {
    isSupported.value = 'showDirectoryPicker' in window
    return isSupported.value
  }

  // フォルダを選択して構造を解析（キャラクター作成用）
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

  // 衣装フォルダを選択して構造を解析（衣装追加用）
  const selectOutfitFolder = async (): Promise<FolderStructure | null> => {
    if (!checkSupport()) {
      throw new Error('このブラウザはフォルダ選択をサポートしていません')
    }

    try {
      const directoryHandle = await (window as unknown as FileSystemAccessAPI).showDirectoryPicker({
        mode: 'read',
      })

      // 衣装フォルダとして解析（フォルダ名を衣装名として扱う）
      const outfitName = directoryHandle.name
      const images: File[] = []

      // 画像ファイルの拡張子
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']

      for await (const [name, handle] of directoryHandle.entries()) {
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

      if (images.length === 0) {
        throw new Error('選択されたフォルダに画像ファイルが見つかりません')
      }

      const structure: FolderStructure = {
        characterName: '', // 衣装追加時は空
        outfits: [
          {
            outfitName,
            images,
          },
        ],
      }

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

  // 背景画像用のフォルダを選択（フォルダ内の全画像を取得）
  const selectImageFolder = async (): Promise<File[] | null> => {
    if (!checkSupport()) {
      throw new Error('このブラウザはフォルダ選択をサポートしていません')
    }

    try {
      const directoryHandle = await (window as unknown as FileSystemAccessAPI).showDirectoryPicker({
        mode: 'read',
      })

      const images: File[] = []

      // 画像ファイルの拡張子
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']

      for await (const [name, handle] of directoryHandle.entries()) {
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

      if (images.length === 0) {
        throw new Error('選択されたフォルダに画像ファイルが見つかりません')
      }

      return images
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // ユーザーがキャンセルした場合
        return null
      }
      logger.error('フォルダ選択に失敗', { component: 'useFolderUpload' }, error)
      throw error
    }
  }

  return {
    isSupported,
    checkSupport,
    selectFolder,
    selectOutfitFolder,
    selectImageFolder,
  }
}
