export interface ActionContext {
  setLoading: (value: boolean) => void
  setError: (message: string | null) => void
  logger?: (message: string, ...args: unknown[]) => void
}

/**
 * 共通の非同期アクションラッパー
 * - ローディング状態・エラーの設定・標準ログを集約
 */
export async function runAction<T>(label: string, ctx: ActionContext, action: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    ctx.setLoading(true)
    ctx.setError(null)
    const data = await action()
    ctx.logger?.(`[DB] ${label} succeeded`)
    return { ok: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    ctx.setError(message)
    ctx.logger?.(`[DB] ${label} failed: ${message}`)
    return { ok: false, error: message }
  } finally {
    ctx.setLoading(false)
  }
}
