import { logger } from '~/utils/logger'
import type { ChatMessage } from '~/types/chat'

/**
 * Base64データの最大サイズ（約10MB）
 * Base64は元のデータサイズの約1.33倍になるため、10MB * 1.33 = 13,107,200バイト
 */
const MAX_BASE64_SIZE_BYTES = 13_107_200

/**
 * Function Calling結果から背景画像の選択結果を抽出する
 */
export interface BackgroundSelectionResult {
  categoryName: string
  imageName: string
}

/**
 * 型ガード：オブジェクトが指定されたプロパティを持つかチェック
 */
function hasProperty<T extends string>(obj: unknown, prop: T): obj is Record<T, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj
}

/**
 * 型ガード：Function Calling結果のdata構造をチェック
 */
function isBackgroundSelectionData(data: unknown): data is { selectionResult: { categoryName: string; imageName: string } } {
  return (
    hasProperty(data, 'selectionResult') &&
    typeof data.selectionResult === 'object' &&
    data.selectionResult !== null &&
    'categoryName' in data.selectionResult &&
    'imageName' in data.selectionResult &&
    typeof (data.selectionResult as { categoryName: unknown }).categoryName === 'string' &&
    typeof (data.selectionResult as { imageName: unknown }).imageName === 'string'
  )
}

/**
 * メッセージからFunction Callingの背景画像選択結果を抽出
 * @param message - チャットメッセージ
 * @returns 背景画像選択結果、見つからない場合はnull
 */
export function extractBackgroundSelectionFromMessage(message: ChatMessage): BackgroundSelectionResult | null {
  if (message.role !== 'assistant' || !message.functionResults) {
    return null
  }

  const backgroundResult = message.functionResults.find((result) => {
    if (result.name !== 'manageBackground' || !result.result || typeof result.result !== 'object') {
      return false
    }
    return hasProperty(result.result, 'data') && typeof result.result.data === 'object' && result.result.data !== null && 'selectionResult' in result.result.data
  })

  if (!backgroundResult?.result) {
    return null
  }

  const resultData = backgroundResult.result
  if (!hasProperty(resultData, 'data') || !isBackgroundSelectionData(resultData.data)) {
    return null
  }

  const { categoryName, imageName } = resultData.data.selectionResult
  return { categoryName, imageName }
}

/**
 * IndexedDBから背景画像データを取得してData URLを生成
 * @param categoryName - カテゴリ名
 * @param imageName - 画像名
 * @returns Data URL、エラー時はnull
 */
export async function getBackgroundImageDataUrl(categoryName: string, imageName: string): Promise<string | null> {
  try {
    const { dbGetBackgroundImageByNames } = await import('~/lib/database')
    const imageResult = await dbGetBackgroundImageByNames(categoryName, imageName)

    if (imageResult.success && imageResult.data) {
      const imageData = imageResult.data

      // Base64データのサイズチェック（メモリ枯渇対策）
      const base64Size = imageData.base64Data.length
      if (base64Size > MAX_BASE64_SIZE_BYTES) {
        logger.warn('[backgroundManager] 背景画像のサイズが上限を超えています', {
          component: 'backgroundManager',
          size: base64Size,
          maxSize: MAX_BASE64_SIZE_BYTES,
          categoryName,
          imageName,
        })
        return null
      }

      return `data:${imageData.mimeType};base64,${imageData.base64Data}`
    } else {
      logger.warn('[backgroundManager] 背景画像データの取得に失敗しました', {
        component: 'backgroundManager',
        error: imageResult.error,
      })
      return null
    }
  } catch (error) {
    logger.error(
      '[backgroundManager] 背景画像データの取得中にエラーが発生しました',
      {
        component: 'backgroundManager',
      },
      error
    )
    return null
  }
}

/**
 * メッセージリストから最新のアシスタントメッセージを取得
 * @param messages - メッセージリスト
 * @returns 最新のアシスタントメッセージ、見つからない場合はnull
 */
export function getLatestAssistantMessage(messages: ChatMessage[]): ChatMessage | null {
  const assistantMessages = messages.filter((msg) => msg.role === 'assistant')
  const latestMessage = assistantMessages[assistantMessages.length - 1]
  return latestMessage ?? null
}
