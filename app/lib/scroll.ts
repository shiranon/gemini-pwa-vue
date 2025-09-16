/**
 * スクロール制御関連のユーティリティ関数
 * ChatInterfaceコンポーネントで使用される関数
 */

/**
 * 要素を一番下までスクロールする
 * @param element - スクロール対象の要素
 */
export const scrollToBottom = (element: HTMLElement): void => {
  element.scrollTop = element.scrollHeight
}
