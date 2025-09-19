import { functionToolDefinitions } from './registry'

/**
 * 登録済みツールの並び順を返す
 */
export const getOrderedFunctionToolNames = (): string[] => {
  return functionToolDefinitions.map((definition) => definition.declaration.name).filter((name): name is string => typeof name === 'string' && name.length > 0)
}

/**
 * ツール選択状態を更新する
 * @param currentSelection 現在選択中のツール名リスト
 * @param toggledName トグル対象のツール名
 * @param enabled トグル後の状態
 * @param orderedToolNames 並び順の基準（指定がなければレジストリ順）
 */
export const computeNextEnabledFunctionTools = (
  currentSelection: readonly string[],
  toggledName: string,
  enabled: boolean,
  orderedToolNames: readonly string[] = getOrderedFunctionToolNames()
): string[] => {
  const availableOrder = Array.from(orderedToolNames).filter((name) => typeof name === 'string' && name.length > 0)
  const selection = new Set(currentSelection.filter((name) => availableOrder.includes(name)))

  if (enabled) {
    selection.add(toggledName)
  } else {
    selection.delete(toggledName)
  }

  const result: string[] = []
  for (const name of availableOrder) {
    if (selection.has(name)) {
      result.push(name)
    }
  }

  // toggledName が既存順序外だった場合は末尾に（enabled時のみ）追加
  if (enabled && !availableOrder.includes(toggledName) && !result.includes(toggledName)) {
    result.push(toggledName)
  }

  return result
}
