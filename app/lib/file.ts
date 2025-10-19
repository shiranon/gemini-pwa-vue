/**
 * ファイル処理関連のユーティリティ関数
 * シンプルなファイル変換機能のみ
 */

import { ATTACHMENT_LIMITS } from '~/constants/constants'
import { formatFileSize } from '~/lib/format'
import { generateFileId } from '~/lib/ids'
import type { AttachedFile } from '~/types/chat'

/**
 * ファイルをAttachedFile形式に変換する
 * @param file - 変換するファイル
 * @param options - オプション設定
 * @param options.validateSize - ファイルサイズ検証を行うかどうか（デフォルト: true）
 * @param options.validateType - ファイル形式検証を行うかどうか（デフォルト: true）
 * @returns AttachedFile形式のPromise
 * @throws {Error} ファイルサイズまたは形式が制限を超えている場合
 * @note プレビューURLは呼び出し側で URL.revokeObjectURL() を使って解放する必要があります
 */
export const convertFileToAttachedFile = async (file: File, options: { validateSize?: boolean; validateType?: boolean } = {}): Promise<AttachedFile> => {
  const { validateSize = true, validateType = true } = options

  // ファイルサイズ検証
  if (validateSize && file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE) {
    throw new Error(`ファイルサイズが上限（${formatFileSize(ATTACHMENT_LIMITS.MAX_FILE_SIZE)}）を超えています`)
  }

  // ファイル形式検証
  if (validateType && !ATTACHMENT_LIMITS.SUPPORTED_TYPES.includes(file.type as (typeof ATTACHMENT_LIMITS.SUPPORTED_TYPES)[number])) {
    throw new Error(`対応していないファイル形式です: ${file.type}`)
  }
  const id = generateFileId()

  // プレビュー用のURLを作成（画像の場合のみ）
  // Note: このURLは呼び出し側で管理・解放する必要があります
  let previewUrl: string | undefined
  if (file.type.startsWith('image/')) {
    previewUrl = URL.createObjectURL(file)
  }

  // Base64エンコード
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (result) {
        const base64Part = result.split(',')[1]
        if (base64Part) {
          resolve(base64Part) // data:... prefixを除去
        } else {
          reject(new Error('Base64データの抽出に失敗しました'))
        }
      } else {
        reject(new Error('ファイル読み込みエラー'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  return {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    data,
    previewUrl,
    createdAt: Date.now(),
  }
}

/**
 * JSONデータをファイルとしてダウンロードする
 * @param data - ダウンロードするオブジェクト
 * @param filename - 保存するファイル名（.json推奨）
 */
export const downloadJson = (data: unknown, filename: string): void => {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`JSONのダウンロードに失敗しました: ${message}`)
  }
}
