import { onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useGeminiApi } from '~/composables/useGeminiApi'
import { logger } from '~/lib/logger'

export interface ModelOption {
  value: string
  label: string
}

export interface UseGeminiModelOptionsReturn {
  modelOptions: Ref<ModelOption[]>
  loadingModels: Ref<boolean>
  fetchModels: () => Promise<void>
}

/**
 * 共通: Geminiモデルの候補を取得し、<Select>用の options 配列として提供する
 * - apiKey の変更を監視して自動で再取得
 * - フォールバックの既定候補を内包
 */
export function useGeminiModelOptions(apiKey: ComputedRef<string> | Ref<string>): UseGeminiModelOptionsReturn {
  const geminiApi = useGeminiApi()

  const defaultModelOptions: ModelOption[] = [
    // Gemini 3 Series (最新)
    { value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview' },
    { value: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'gemini-3.1-flash-lite-preview' },
    // Gemini 2.5 Series
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    // Gemini 2.0 Series
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    { value: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite' },
  ]

  const modelOptions = ref<ModelOption[]>(defaultModelOptions)
  const loadingModels = ref(false)

  const fetchModels = async () => {
    const key = typeof apiKey.value === 'string' ? apiKey.value : ''
    if (!key) {
      modelOptions.value = defaultModelOptions
      return
    }
    try {
      loadingModels.value = true
      const names = await geminiApi.getAvailableModels(key)
      if (Array.isArray(names) && names.length > 0) {
        modelOptions.value = names.map((n) => ({ value: n, label: n }))
      } else {
        modelOptions.value = defaultModelOptions
      }
    } catch (error) {
      logger.error('モデルの読み込みに失敗:', { component: 'useGeminiModelOptions' }, error)
      modelOptions.value = defaultModelOptions
    } finally {
      loadingModels.value = false
    }
  }

  watch(
    () => apiKey.value,
    async (newKey, oldKey) => {
      if (newKey && newKey !== oldKey) await fetchModels()
    }
  )

  onMounted(async () => {
    if (apiKey.value && String(apiKey.value).length > 0) await fetchModels()
  })

  return {
    modelOptions,
    loadingModels,
    fetchModels,
  }
}
