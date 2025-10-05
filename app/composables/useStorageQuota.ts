import { computed, ref } from 'vue'
import { logger } from '~/utils/logger'

export interface StorageQuotaInfo {
  quota: number
  usage: number
  available: number
  usagePercentage: number
}

export interface StorageWarning {
  level: 'info' | 'warning' | 'critical'
  message: string
  threshold: number
}

export function useStorageQuota() {
  const quotaInfo = ref<StorageQuotaInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 警告レベルを計算（実際の検証結果に基づく保守的な設定）
  const warningLevel = computed((): StorageWarning | null => {
    if (!quotaInfo.value) return null

    const { usagePercentage } = quotaInfo.value

    if (usagePercentage >= 60) {
      return {
        level: 'critical',
        message: 'ストレージ容量が60%を超えています。実際の検証では環境により制限が大幅に異なるため、データの削除を検討してください。',
        threshold: 60,
      }
    } else if (usagePercentage >= 50) {
      return {
        level: 'critical',
        message: 'ストレージ容量が50%を超えています。実際の検証では環境により制限が大幅に異なるため、注意が必要です。',
        threshold: 50,
      }
    } else if (usagePercentage >= 30) {
      return {
        level: 'warning',
        message: 'ストレージ容量が30%を超えています。容量の監視を推奨します。',
        threshold: 30,
      }
    }

    return null
  })

  // IndexedDBのクォータ情報を取得
  const getStorageQuota = async (): Promise<StorageQuotaInfo | null> => {
    try {
      isLoading.value = true
      error.value = null

      if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
        logger.warn('Storage APIがサポートされていません', { component: 'useStorageQuota' })
        return null
      }

      // 注意: navigator.storage.estimate()はオリジン（ドメイン）ごとの制限を返す
      // これはPC全体のストレージではなく、このWebサイトに割り当てられた容量
      const estimate = await navigator.storage.estimate()

      if (!estimate.quota || estimate.usage === undefined) {
        logger.warn('ストレージクォータ情報を取得できませんでした', { component: 'useStorageQuota' })
        return null
      }

      const info: StorageQuotaInfo = {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota - estimate.usage,
        usagePercentage: Math.round((estimate.usage / estimate.quota) * 100),
      }

      quotaInfo.value = info
      logger.info('IndexedDBオリジン制限情報を取得しました', {
        component: 'useStorageQuota',
        quota: info.quota,
        usage: info.usage,
        usagePercentage: info.usagePercentage,
        note: 'これはオリジン（ドメイン）ごとの制限であり、PC全体のストレージではありません',
      })

      return info
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      logger.error('ストレージクォータの取得に失敗しました:', { component: 'useStorageQuota' }, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Base64データの実際のサイズを計算
  const calculateBase64Size = (base64Data: string): number => {
    // Base64エンコードされたデータの実際のバイト数を計算
    // Base64は4文字で3バイトを表現するため、パディングを考慮して計算
    const base64Length = base64Data.length
    const paddingCount = (base64Data.match(/=/g) || []).length
    return Math.floor((base64Length * 3) / 4) - paddingCount
  }

  // ファイルサイズからBase64サイズを推定
  const estimateBase64Size = (fileSize: number): number => {
    // Base64は元のファイルサイズの約133%（4/3倍）になる
    return Math.ceil(fileSize * 1.33)
  }

  // 新しいデータを追加する前に容量チェック
  const checkStorageCapacity = async (
    additionalSize: number
  ): Promise<{
    canAdd: boolean
    warning?: StorageWarning
    estimatedUsagePercentage?: number
  }> => {
    const currentQuota = await getStorageQuota()
    if (!currentQuota) {
      return { canAdd: false }
    }

    const newUsage = currentQuota.usage + additionalSize
    const newUsagePercentage = Math.round((newUsage / currentQuota.quota) * 100)

    // QuotaExceededErrorを避けるための安全マージンを考慮
    // 実際の検証結果に基づき、より保守的な閾値を設定
    // 参考: https://iwatendo.hateblo.jp/entry/2018/02/15/215811
    // 実際の制限は環境により大幅に異なる（Android: 688MB, Ubuntu: 1.1GB, macOS: 7GB, Windows: 12GB）
    const safeThreshold = 60 // より保守的に60%に設定
    if (newUsagePercentage > safeThreshold) {
      return {
        canAdd: false,
        warning: {
          level: 'critical',
          message: `ストレージ容量が${safeThreshold}%を超えるため、アップロードをブロックしました。実際の検証では環境により制限が大幅に異なるため、安全のため早期にブロックしています。`,
          threshold: safeThreshold,
        },
        estimatedUsagePercentage: newUsagePercentage,
      }
    }

    // 警告レベルのチェック（より早期の警告）
    let warning: StorageWarning | undefined
    if (newUsagePercentage >= 50) {
      warning = {
        level: 'critical',
        message: 'ストレージ容量が50%を超えています。実際の検証では環境により制限が大幅に異なるため、注意が必要です。',
        threshold: 50,
      }
    } else if (newUsagePercentage >= 30) {
      warning = {
        level: 'warning',
        message: 'ストレージ容量が30%を超えています。容量の監視を推奨します。',
        threshold: 30,
      }
    }

    return {
      canAdd: true,
      warning,
      estimatedUsagePercentage: newUsagePercentage,
    }
  }

  // バイト数を人間が読みやすい形式に変換
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // 使用率をパーセンテージで表示
  const formatUsagePercentage = (percentage: number): string => {
    return `${percentage}%`
  }

  // QuotaExceededErrorのハンドリング
  const handleQuotaExceededError = (error: Error): StorageWarning => {
    logger.error('QuotaExceededErrorが発生しました:', { component: 'useStorageQuota' }, error)
    return {
      level: 'critical',
      message: 'ストレージ容量が上限に達しました。データの削除が必要です。',
      threshold: 100,
    }
  }

  // ストレージクォータの詳細情報を取得
  const getStorageQuotaDetails = async (): Promise<{
    quota: number
    usage: number
    available: number
    usagePercentage: number
    browserInfo: string
    recommendations: string[]
    explanation: string
  } | null> => {
    const quota = await getStorageQuota()
    if (!quota) return null

    const browserInfo = navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown'

    const recommendations: string[] = []
    if (quota.usagePercentage > 70) {
      recommendations.push('古いチャットデータの削除を検討してください')
      recommendations.push('大きな画像ファイルの圧縮を検討してください')
    }
    if (quota.usagePercentage > 50) {
      recommendations.push('定期的なデータのバックアップとクリーンアップを推奨します')
    }

    const explanation = `この容量は、このWebサイト（オリジン）にブラウザが割り当てたIndexedDBの制限です。PC全体のストレージ容量とは異なります。実際の検証では、環境により制限が大幅に異なることが確認されています（Android: 688MB, Ubuntu: 1.1GB, macOS: 7GB, Windows: 12GB）。詳細: https://iwatendo.hateblo.jp/entry/2018/02/15/215811`

    return {
      ...quota,
      browserInfo,
      recommendations,
      explanation,
    }
  }

  return {
    quotaInfo: computed(() => quotaInfo.value),
    warningLevel,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    getStorageQuota,
    calculateBase64Size,
    estimateBase64Size,
    checkStorageCapacity,
    handleQuotaExceededError,
    getStorageQuotaDetails,
    formatBytes,
    formatUsagePercentage,
  }
}
