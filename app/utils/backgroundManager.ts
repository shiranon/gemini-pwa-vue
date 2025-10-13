import { logger } from '~/utils/logger'
import type { ChatMessage } from '~/types/chat'

/**
 * Function Calling結果から背景画像の選択結果を抽出する
 */
export interface BackgroundSelectionResult {
  categoryName: string
  imageName: string
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
    if (result.name === 'manageBackground' && result.result && typeof result.result === 'object') {
      const resultData = result.result as Record<string, unknown>
      return resultData.data && typeof resultData.data === 'object' && 'selectionResult' in resultData.data
    }
    return false
  })

  if (!backgroundResult?.result || typeof backgroundResult.result !== 'object' || !('data' in backgroundResult.result)) {
    return null
  }

  const resultData = backgroundResult.result as Record<string, unknown>
  if (!resultData.data || typeof resultData.data !== 'object' || !('selectionResult' in resultData.data)) {
    return null
  }

  const data = resultData.data as Record<string, unknown>
  const selectionResult = data.selectionResult as Record<string, unknown>

  if (typeof selectionResult.categoryName === 'string' && typeof selectionResult.imageName === 'string') {
    return {
      categoryName: selectionResult.categoryName,
      imageName: selectionResult.imageName,
    }
  }

  return null
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
