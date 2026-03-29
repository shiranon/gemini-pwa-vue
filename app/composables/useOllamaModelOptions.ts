import { onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useOllamaApi } from '~/composables/useOllamaApi'
import { logger } from '~/lib/logger'
import { protocolRestrictedUrlSchema } from '~/lib/validation'
import type { ModelOption } from '~/composables/useGeminiModelOptions'

export interface UseOllamaModelOptionsReturn {
  modelOptions: Ref<ModelOption[]>
  loadingModels: Ref<boolean>
  connectionError: Ref<string | null>
  fetchModels: () => Promise<void>
}

/**
 * Ollamaモデルの候補を取得し、<Select>用の options 配列として提供する
 * - baseUrl の変更を監視して自動で再取得
 * - 接続エラーの状態管理
 */
export function useOllamaModelOptions(baseUrl: ComputedRef<string> | Ref<string>): UseOllamaModelOptionsReturn {
  const ollamaApi = useOllamaApi()

  const modelOptions = ref<ModelOption[]>([])
  const loadingModels = ref(false)
  const connectionError = ref<string | null>(null)

  const fetchModels = async () => {
    const url = typeof baseUrl.value === 'string' ? baseUrl.value : ''
    if (!url) {
      modelOptions.value = []
      connectionError.value = 'ベースURLが設定されていません'
      return
    }

    // URLバリデーション
    const urlValidation = protocolRestrictedUrlSchema().safeParse(url)
    if (!urlValidation.success) {
      modelOptions.value = []
      connectionError.value = '無効なURLです。http:// または https:// で始まるURLを入力してください。'
      return
    }

    try {
      loadingModels.value = true
      connectionError.value = null
      const names = await ollamaApi.getAvailableModels(url)
      if (Array.isArray(names) && names.length > 0) {
        modelOptions.value = names.map((n) => ({ value: n, label: n }))
      } else {
        modelOptions.value = []
        connectionError.value = 'モデルが見つかりません。Ollamaでモデルをダウンロードしてください。'
      }
    } catch (error) {
      logger.error('Ollamaモデルの読み込みに失敗:', { component: 'useOllamaModelOptions' }, error)
      modelOptions.value = []
      connectionError.value = 'Ollamaに接続できません。Ollamaが起動しているか確認してください。'
    } finally {
      loadingModels.value = false
    }
  }

  watch(
    () => baseUrl.value,
    async (newUrl, oldUrl) => {
      if (newUrl && newUrl !== oldUrl) await fetchModels()
    }
  )

  onMounted(async () => {
    if (baseUrl.value && String(baseUrl.value).length > 0) await fetchModels()
  })

  return {
    modelOptions,
    loadingModels,
    connectionError,
    fetchModels,
  }
}
