import { marked } from 'marked'

/**
 * マークダウン処理関連のユーティリティ関数
 */

// markedの設定
marked.setOptions({
  breaks: true, // 改行を<br>に変換
  gfm: true, // GitHub Flavored Markdown
})

/**
 * MessageBubbleで使用されるマークダウンテキストをHTMLに変換する
 * @param content - 変換するマークダウンテキスト
 * @returns HTML文字列
 */
export const formatMessageContent = (content: string): string => {
  if (!content) return ''

  try {
    return marked.parse(content) as string
  } catch (error) {
    console.warn('Markdown parsing failed:', error)
    return content.replace(/\n/g, '<br>')
  }
}
