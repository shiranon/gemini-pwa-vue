import imageCompression from 'browser-image-compression'
import { ref } from 'vue'
import { IMAGE_LIMITS } from '~/constants/constants'
import { logger } from '~/utils/logger'

export interface ImageOptimizationOptions {
  /** 最大幅（デフォルト: 1920px） */
  maxWidth?: number
  /** 最大高さ（デフォルト: 1080px） */
  maxHeight?: number
  /** 圧縮品質（0-1、デフォルト: 0.8） */
  quality?: number
  /** WebP変換を有効にするか（デフォルト: true） */
  enableWebP?: boolean
  /** WebP品質（0-1、デフォルト: 0.9） */
  webpQuality?: number
  /** 最大ファイルサイズ（バイト、デフォルト: 5MB） */
  maxSizeMB?: number
}

export interface OptimizationResult {
  /** 最適化されたFileオブジェクト */
  file: File
  /** 元のファイルサイズ（バイト） */
  originalSize: number
  /** 最適化後のファイルサイズ（バイト） */
  optimizedSize: number
  /** 圧縮率（%） */
  compressionRatio: number
  /** 使用されたMIMEタイプ */
  mimeType: string
  /** 最適化の詳細情報 */
  details: {
    resized: boolean
    webpConverted: boolean
    quality: number
  }
}

/**
 * 画像最適化Composable
 * Base64エンコーディングによる33%のサイズ増加を考慮し、
 * 画像の自動リサイズとWebP変換でストレージ効率を向上
 */
export function useImageOptimization() {
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  /**
   * 画像を最適化する
   */
  const optimizeImage = async (file: File, options: ImageOptimizationOptions = {}): Promise<OptimizationResult | null> => {
    if (!file) {
      error.value = 'ファイルが指定されていません'
      return null
    }

    if (!file.type.startsWith('image/')) {
      error.value = '画像ファイルではありません'
      return null
    }

    try {
      isProcessing.value = true
      error.value = null

      const {
        maxWidth = IMAGE_LIMITS.MAX_WIDTH,
        maxHeight = IMAGE_LIMITS.MAX_HEIGHT,
        quality = IMAGE_LIMITS.COMPRESSION_QUALITY,
        enableWebP = true,
        webpQuality = IMAGE_LIMITS.WEBP_QUALITY,
        maxSizeMB = IMAGE_LIMITS.MAX_FILE_SIZE / (1024 * 1024),
      } = options

      const originalSize = file.size
      let optimizedFile = file
      let resized = false
      let webpConverted = false
      let finalQuality = quality

      logger.info('画像最適化を開始', {
        component: 'useImageOptimization',
        originalSize,
        fileName: file.name,
        fileType: file.type,
      })

      // 1. リサイズ処理
      const needsResize = await shouldResize(file, maxWidth, maxHeight)
      if (needsResize) {
        optimizedFile = await imageCompression(file, {
          maxWidthOrHeight: Math.max(maxWidth, maxHeight),
          useWebWorker: true,
        })
        resized = true
        logger.info('画像をリサイズしました', {
          component: 'useImageOptimization',
          originalSize,
          resizedSize: optimizedFile.size,
        })
      }

      // 2. WebP変換処理
      if (enableWebP && !isWebP(optimizedFile)) {
        const webpFile = await convertToWebP(optimizedFile, webpQuality)
        if (webpFile && webpFile.size < optimizedFile.size) {
          optimizedFile = webpFile
          webpConverted = true
          finalQuality = webpQuality
          logger.info('WebP変換を実行しました', {
            component: 'useImageOptimization',
            beforeSize: resized ? optimizedFile.size : originalSize,
            webpSize: webpFile.size,
          })
        }
      }

      // 3. 最終的なファイルサイズチェック
      if (optimizedFile.size > IMAGE_LIMITS.MAX_FILE_SIZE) {
        // さらに圧縮を試行
        const furtherCompressed = await imageCompression(optimizedFile, {
          maxSizeMB: maxSizeMB,
          useWebWorker: true,
        })
        optimizedFile = furtherCompressed
        logger.info('追加圧縮を実行しました', {
          component: 'useImageOptimization',
          beforeSize: optimizedFile.size,
          afterSize: furtherCompressed.size,
        })
      }

      const compressionRatio = Math.round(((originalSize - optimizedFile.size) / originalSize) * 100)

      const result: OptimizationResult = {
        file: optimizedFile,
        originalSize,
        optimizedSize: optimizedFile.size,
        compressionRatio,
        mimeType: optimizedFile.type,
        details: {
          resized,
          webpConverted,
          quality: finalQuality,
        },
      }

      logger.info('画像最適化が完了しました', {
        component: 'useImageOptimization',
        originalSize,
        optimizedSize: optimizedFile.size,
        compressionRatio: `${compressionRatio}%`,
        resized,
        webpConverted,
      })

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像最適化に失敗しました'
      error.value = errorMessage
      logger.error('画像最適化エラー:', { component: 'useImageOptimization' }, err)
      return null
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * 画像のリサイズが必要かどうかを判定
   */
  const shouldResize = async (file: File, maxWidth: number, maxHeight: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve(img.width > maxWidth || img.height > maxHeight)
      }
      img.onerror = () => {
        resolve(false)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * WebP形式に変換
   */
  const convertToWebP = async (file: File, quality: number): Promise<File | null> => {
    try {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx?.drawImage(img, 0, 0)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                  type: 'image/webp',
                })
                resolve(webpFile)
              } else {
                reject(new Error('WebP変換に失敗しました'))
              }
            },
            'image/webp',
            quality
          )
        }

        img.onerror = () => {
          reject(new Error('画像の読み込みに失敗しました'))
        }

        img.src = URL.createObjectURL(file)
      })
    } catch (err) {
      logger.error('WebP変換エラー:', { component: 'useImageOptimization' }, err)
      return null
    }
  }

  /**
   * WebP形式かどうかを判定
   */
  const isWebP = (file: File): boolean => {
    return file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp')
  }

  /**
   * 最適化統計情報を取得
   */
  const getOptimizationStats = (result: OptimizationResult) => {
    const sizeReduction = result.originalSize - result.optimizedSize
    const sizeReductionMB = (sizeReduction / (1024 * 1024)).toFixed(2)
    const originalSizeMB = (result.originalSize / (1024 * 1024)).toFixed(2)
    const optimizedSizeMB = (result.optimizedSize / (1024 * 1024)).toFixed(2)

    return {
      originalSizeMB,
      optimizedSizeMB,
      sizeReductionMB,
      compressionRatio: result.compressionRatio,
      details: result.details,
    }
  }

  return {
    isProcessing,
    error,
    optimizeImage,
    getOptimizationStats,
  }
}
