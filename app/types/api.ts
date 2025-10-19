/**
 * API レスポンスから思考プロセスを抽出する結果
 */
export interface ThoughtExtractionResult {
  content: string
  thoughts?: string
}
