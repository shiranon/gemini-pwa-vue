import { beforeEach, describe, expect, it } from 'bun:test'
import { safeJsonParse, sleep, toApiError } from '~/lib/apiStoreCommon'
import type { ApiError } from '~/types/chat'

// ============================================================================
// safeJsonParse
// ============================================================================

describe('safeJsonParse', () => {
  it('正常なJSONをパースできる', () => {
    const result = safeJsonParse('{"key": "value", "num": 42}')
    expect(result).toEqual({ key: 'value', num: 42 })
  })

  it('不正なJSONでデフォルトフォールバック値(空オブジェクト)を返す', () => {
    const result = safeJsonParse('invalid json')
    expect(result).toEqual({})
  })

  it('カスタムフォールバック値を返す', () => {
    const fallback = { error: 'parse failed', code: 0 }
    const result = safeJsonParse('not json', fallback)
    expect(result).toEqual({ error: 'parse failed', code: 0 })
  })

  it('空文字列でフォールバックを返す', () => {
    const result = safeJsonParse('')
    expect(result).toEqual({})
  })

  it('ネストされたJSONを正しくパースする', () => {
    const json = '{"a": {"b": [1, 2, 3]}}'
    const result = safeJsonParse(json)
    expect(result).toEqual({ a: { b: [1, 2, 3] } })
  })
})

// ============================================================================
// toApiError
// ============================================================================

describe('toApiError', () => {
  describe('メッセージの抽出', () => {
    it('Errorインスタンスからメッセージを抽出する', () => {
      const error = new Error('Something went wrong')
      const result = toApiError(error)
      expect(result.message).toBe('Something went wrong')
    })

    it('文字列エラーからメッセージを抽出する', () => {
      const result = toApiError('string error message')
      expect(result.message).toBe('string error message')
    })

    it('unknown型(null)の場合デフォルトメッセージを返す', () => {
      const result = toApiError(null)
      expect(result.message).toBe('不明なエラーが発生しました')
    })

    it('unknown型(undefined)の場合デフォルトメッセージを返す', () => {
      const result = toApiError(undefined)
      expect(result.message).toBe('不明なエラーが発生しました')
    })

    it('unknown型(数値)の場合デフォルトメッセージを返す', () => {
      const result = toApiError(42)
      expect(result.message).toBe('不明なエラーが発生しました')
    })

    it('messageプロパティを持つオブジェクトからメッセージを抽出する', () => {
      const result = toApiError({ message: 'obj error', status: 500 })
      expect(result.message).toBe('obj error')
    })

    it('statusプロパティからHTTPコードを抽出する', () => {
      const result = toApiError({ message: 'server error', status: 500 })
      expect(result.code).toBe('HTTP_500')
    })

    it('codeプロパティを持つオブジェクトからコードを抽出する', () => {
      const result = toApiError({ message: 'err', code: 'CUSTOM_CODE' })
      expect(result.code).toBe('CUSTOM_CODE')
    })

    it('Errorのcauseをdetailsに格納する', () => {
      const cause = { detail: 'root cause' }
      const error = new Error('wrapper', { cause })
      const result = toApiError(error)
      expect(result.details).toEqual(cause)
    })

    it('apiErrorプロパティを持つオブジェクトはそのまま返す', () => {
      const apiError: ApiError = { code: 'TEST', message: 'test', retirable: false }
      const result = toApiError({ apiError })
      expect(result).toEqual(apiError)
    })
  })

  describe('ネットワークエラーの検出 (retirable: true)', () => {
    it.each(['network error occurred', 'fetch failed', 'ECONNREFUSED'])('"%s" を含むメッセージはretirable: trueになる', (msg) => {
      const result = toApiError(new Error(msg))
      expect(result.retirable).toBe(true)
    })
  })

  describe('認証エラーの検出 (retirable: false)', () => {
    it.each(['unauthorized access', 'invalid api key provided', 'permission denied'])('"%s" を含むメッセージはretirable: falseになる', (msg) => {
      const result = toApiError(new Error(msg))
      expect(result.retirable).toBe(false)
    })
  })

  describe('レートリミットエラー (デフォルトではretirable: true)', () => {
    it.each(['rate limit exceeded', 'HTTP 429 Too Many Requests'])('"%s" を含むメッセージはretirable: trueになる', (msg) => {
      const result = toApiError(new Error(msg))
      expect(result.retirable).toBe(true)
    })
  })

  describe('extraRetriableKeywords オプション', () => {
    it('non-retriableに判定されたエラーをretriableに上書きする', () => {
      // "unauthorized"はベースnon-retriableキーワード → retirable: false
      const result = toApiError(new Error('unauthorized but retryable'), {
        extraRetriableKeywords: ['retryable'],
      })
      expect(result.retirable).toBe(true)
    })
  })

  describe('extraNonRetriableKeywords オプション', () => {
    it('追加キーワードでnon-retriableに判定する', () => {
      // "custom block"はデフォルトではretirable: true
      const withoutOption = toApiError(new Error('custom block error'))
      expect(withoutOption.retirable).toBe(true)

      const withOption = toApiError(new Error('custom block error'), {
        extraNonRetriableKeywords: ['custom block'],
      })
      expect(withOption.retirable).toBe(false)
    })
  })

  describe('extraNonRetriablePatterns オプション', () => {
    it('追加パターンでnon-retriableに判定する', () => {
      const withoutOption = toApiError(new Error('error code ABC-123'))
      expect(withoutOption.retirable).toBe(true)

      const withOption = toApiError(new Error('error code ABC-123'), {
        extraNonRetriablePatterns: [/abc-\d+/],
      })
      expect(withOption.retirable).toBe(false)
    })
  })

  describe('extraRetriablePatterns オプション', () => {
    it('non-retriableに判定されたエラーをパターンでretriableに上書きする', () => {
      // "invalid argument"はnon-retriableだが、パターンで上書き
      const result = toApiError(new Error('invalid argument temporary'), {
        extraRetriablePatterns: [/temporary$/],
      })
      expect(result.retirable).toBe(true)
    })
  })

  describe('デフォルトのリトライ可否判定', () => {
    it('non-retriableキーワードを含まないエラーはretirable: trueになる', () => {
      const result = toApiError(new Error('something unexpected happened'))
      expect(result.retirable).toBe(true)
    })

    it.each(['invalid argument in request', 'invalid api key', 'permission denied', 'unauthorized', 'format error in payload'])(
      'ベースnon-retriableキーワード "%s" でretirable: falseになる',
      (msg) => {
        const result = toApiError(new Error(msg))
        expect(result.retirable).toBe(false)
      }
    )
  })
})

// ============================================================================
// sleep
// ============================================================================

describe('sleep', () => {
  it('指定ミリ秒後にresolveする', async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    // 50ms以上経過していることを確認（タイマーの精度を考慮して緩めに判定）
    expect(elapsed).toBeGreaterThanOrEqual(40)
    expect(elapsed).toBeLessThan(200)
  })
})

// ============================================================================
// createApiStoreState
// ============================================================================

describe('createApiStoreState', () => {
  // createApiStoreStateはVue refを使うため動的インポート
  let createApiStoreState: typeof import('~/lib/apiStoreCommon').createApiStoreState

  beforeEach(async () => {
    const mod = await import('~/lib/apiStoreCommon')
    createApiStoreState = mod.createApiStoreState
  })

  describe('初期状態', () => {
    it('isSendingがfalseである', () => {
      const state = createApiStoreState()
      expect(state.isSending.value).toBe(false)
    })

    it('isStreamingがfalseである', () => {
      const state = createApiStoreState()
      expect(state.isStreaming.value).toBe(false)
    })

    it('streamingMessageIdがnullである', () => {
      const state = createApiStoreState()
      expect(state.streamingMessageId.value).toBeNull()
    })

    it('streamingContentが空文字列である', () => {
      const state = createApiStoreState()
      expect(state.streamingContent.value).toBe('')
    })

    it('currentErrorがnullである', () => {
      const state = createApiStoreState()
      expect(state.currentError.value).toBeNull()
    })

    it('lastErrorTimeがnullである', () => {
      const state = createApiStoreState()
      expect(state.lastErrorTime.value).toBeNull()
    })

    it('API統計が全て0である', () => {
      const state = createApiStoreState()
      expect(state.totalApiCalls.value).toBe(0)
      expect(state.successfulCalls.value).toBe(0)
      expect(state.failedCalls.value).toBe(0)
    })

    it('isIdleがtrueである', () => {
      const state = createApiStoreState()
      expect(state.isIdle.value).toBe(true)
    })

    it('hasErrorがfalseである', () => {
      const state = createApiStoreState()
      expect(state.hasError.value).toBe(false)
    })

    it('successRateが0である', () => {
      const state = createApiStoreState()
      expect(state.successRate.value).toBe(0)
    })
  })

  describe('setError / clearError', () => {
    it('setErrorでエラーメッセージが設定される', () => {
      const state = createApiStoreState()
      state.setError('test error')
      expect(state.currentError.value).toBe('test error')
      expect(state.lastErrorTime.value).not.toBeNull()
    })

    it('setError後hasErrorがtrueになる', () => {
      const state = createApiStoreState()
      state.setError('test error')
      expect(state.hasError.value).toBe(true)
    })

    it('clearErrorでエラーがクリアされる', () => {
      const state = createApiStoreState()
      state.setError('test error')
      state.clearError()
      expect(state.currentError.value).toBeNull()
      expect(state.lastErrorTime.value).toBeNull()
      expect(state.hasError.value).toBe(false)
    })
  })

  describe('ストリーミング制御', () => {
    it('isStreamingをtrueにするとisIdleがfalseになる', () => {
      const state = createApiStoreState()
      state.isStreaming.value = true
      expect(state.isIdle.value).toBe(false)
    })

    it('isSendingをtrueにするとisIdleがfalseになる', () => {
      const state = createApiStoreState()
      state.isSending.value = true
      expect(state.isIdle.value).toBe(false)
    })

    it('stopStreamingでストリーミング状態がリセットされる', () => {
      const state = createApiStoreState()
      state.isStreaming.value = true
      state.streamingContent.value = 'partial content'
      state.streamingMessageId.value = 'msg-123'

      state.stopStreaming()

      expect(state.isStreaming.value).toBe(false)
      expect(state.streamingContent.value).toBe('')
      expect(state.streamingMessageId.value).toBeNull()
    })

    it('stopStreamingはストリーミング中でない場合何もしない', () => {
      const state = createApiStoreState()
      state.streamingContent.value = 'some content'

      state.stopStreaming()

      // isStreaming=falseなのでstopStreamingの中身は実行されない
      expect(state.streamingContent.value).toBe('some content')
    })
  })

  describe('cancelSending', () => {
    it('送信中の場合isSendingをfalseにしストリーミングも停止する', () => {
      const state = createApiStoreState()
      state.isSending.value = true
      state.isStreaming.value = true
      state.streamingContent.value = 'content'

      state.cancelSending()

      expect(state.isSending.value).toBe(false)
      expect(state.isStreaming.value).toBe(false)
      expect(state.streamingContent.value).toBe('')
    })
  })

  describe('resetStats', () => {
    it('API統計をリセットする', () => {
      const state = createApiStoreState()
      state.totalApiCalls.value = 10
      state.successfulCalls.value = 8
      state.failedCalls.value = 2

      state.resetStats()

      expect(state.totalApiCalls.value).toBe(0)
      expect(state.successfulCalls.value).toBe(0)
      expect(state.failedCalls.value).toBe(0)
    })
  })

  describe('successRate computed', () => {
    it('API呼び出しがない場合0を返す', () => {
      const state = createApiStoreState()
      expect(state.successRate.value).toBe(0)
    })

    it('成功率を正しく計算する', () => {
      const state = createApiStoreState()
      state.totalApiCalls.value = 10
      state.successfulCalls.value = 7
      expect(state.successRate.value).toBe(70)
    })
  })

  describe('reset', () => {
    it('全ての状態を初期値にリセットする', () => {
      const state = createApiStoreState()
      state.isSending.value = true
      state.isStreaming.value = true
      state.streamingMessageId.value = 'msg-1'
      state.streamingContent.value = 'content'
      state.setError('error')
      state.totalApiCalls.value = 5
      state.successfulCalls.value = 3
      state.failedCalls.value = 2

      state.reset()

      expect(state.isSending.value).toBe(false)
      expect(state.isStreaming.value).toBe(false)
      expect(state.streamingMessageId.value).toBeNull()
      expect(state.streamingContent.value).toBe('')
      expect(state.currentError.value).toBeNull()
      expect(state.lastErrorTime.value).toBeNull()
      expect(state.totalApiCalls.value).toBe(0)
      expect(state.successfulCalls.value).toBe(0)
      expect(state.failedCalls.value).toBe(0)
    })
  })
})
