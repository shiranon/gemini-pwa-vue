/**
 * タッチ操作関連のユーティリティ関数
 * 画像の拡縮・パン操作に必要な基本機能のみ
 */

/**
 * 2つのタッチポイント間の距離を計算する
 * @param touch1 - 最初のタッチポイント
 * @param touch2 - 2番目のタッチポイント
 * @returns 距離（ピクセル）
 */
export const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
  const dx = touch1.clientX - touch2.clientX
  const dy = touch1.clientY - touch2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 2つのタッチポイントの中心座標を計算する
 * @param touch1 - 最初のタッチポイント
 * @param touch2 - 2番目のタッチポイント
 * @returns 中心座標
 */
export const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  }
}
