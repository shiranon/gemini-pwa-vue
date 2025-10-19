/**
 * ファイル処理関連のユーティリティ関数
 * シンプルなファイル変換機能のみ
 */

import { generateFileId } from '~/lib/ids'
import type { AttachedFile } from '~/types/chat'

/**
 * ファイルをAttachedFile形式に変換する
 * @param file - 変換するファイル
 * @returns AttachedFile形式のPromise
 */
export const convertFileToAttachedFile = async (file: File): Promise<AttachedFile> => {
  const id = generateFileId()

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
