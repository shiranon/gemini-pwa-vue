/**
 * フォーマット関連のユーティリティ関数
 * 汎用性: 高 - 日時・テキスト処理で再利用可能
 */

export interface DateFormatOptions {
  includeTime?: boolean
  includeSeconds?: boolean
  use24Hour?: boolean
  locale?: string
}

export interface NumberFormatOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

/**
 * ファイルサイズをフォーマットして返す
 * @param bytes - バイト数
 * @returns フォーマットされたファイルサイズ文字列
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * タイムスタンプを相対的な日本語形式でフォーマット
 * @param timestamp - フォーマットするタイムスタンプ
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 1日以内の場合は時間で表示
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 7日以内の場合は曜日で表示
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('ja-JP', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // それ以外は日付で表示
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 長いテキストを指定された文字数で切り詰める
 * @param content - 切り詰める文字列
 * @param maxLength - 最大文字数（デフォルト: 100）
 * @param suffix - 省略記号（デフォルト: '...'）
 * @returns 切り詰められた文字列
 */
export const truncateMessage = (content: string, maxLength: number = 100, suffix: string = '...'): string => {
  if (content.length <= maxLength) {
    return content
  }
  return content.substring(0, maxLength) + suffix
}

/**
 * 長いテキストを単語境界で切り詰める
 * @param content - 切り詰める文字列
 * @param maxLength - 最大文字数
 * @param suffix - 省略記号
 * @returns 切り詰められた文字列
 */
export const truncateText = (content: string, maxLength: number = 100, suffix: string = '...'): string => {
  if (content.length <= maxLength) {
    return content
  }

  // 単語境界で切り詰める
  const truncated = content.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + suffix
  }

  return truncated + suffix
}

/**
 * タイムスタンプを指定フォーマットで表示する
 * @param timestamp - フォーマットするタイムスタンプ
 * @param options - フォーマットオプション
 * @returns フォーマットされた日時文字列
 */
export const formatTimestamp = (timestamp: number, options: DateFormatOptions = {}): string => {
  const { includeTime = true, includeSeconds = false, use24Hour = true, locale = 'ja-JP' } = options

  const date = new Date(timestamp)

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }

  if (includeTime) {
    dateOptions.hour = '2-digit'
    dateOptions.minute = '2-digit'
    dateOptions.hour12 = !use24Hour

    if (includeSeconds) {
      dateOptions.second = '2-digit'
    }
  }

  return date.toLocaleDateString(locale, dateOptions)
}

/**
 * 相対時間を日本語で表示する
 * @param timestamp - 基準となるタイムスタンプ
 * @param baseTime - 比較基準時刻（デフォルトは現在時刻）
 * @returns 相対時間文字列
 */
export const formatRelativeTime = (timestamp: number, baseTime: number = Date.now()): string => {
  const diff = baseTime - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  if (hours < 24) return `${hours}時間前`
  if (days < 7) return `${days}日前`
  if (weeks < 4) return `${weeks}週間前`
  if (months < 12) return `${months}ヶ月前`
  return `${years}年前`
}

/**
 * 配列を自然な日本語リストにフォーマットする
 * @param items - 項目の配列
 * @param conjunction - 最後の接続詞（デフォルト: 'と'）
 * @returns フォーマットされたリスト文字列
 */
export const formatList = (items: string[], conjunction: string = 'と'): string => {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0] || ''
  if (items.length === 2) return `${items[0]}${conjunction}${items[1]}`

  const lastItem = items[items.length - 1]
  const otherItems = items.slice(0, -1)

  return `${otherItems.join('、')}${conjunction}${lastItem}`
}

/**
 * MessageBubbleで使用される時刻フォーマット
 * @param timestamp - フォーマットするタイムスタンプ
 * @returns フォーマットされた時刻文字列
 */
export const formatMessageTimestamp = (timestamp?: number): string => {
  if (!timestamp) return ''

  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
