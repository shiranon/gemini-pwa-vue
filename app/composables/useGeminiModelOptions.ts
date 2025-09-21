import { onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useGeminiApi } from '~/composables/useGeminiApi'

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
    { value: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    { value: 'gemini-2.5-flash-preview-04-17', label: 'gemini-2.5-flash-preview-04-17' },
    { value: 'gemini-2.5-flash-preview-05-20', label: 'gemini-2.5-flash-preview-05-20' },
    { value: 'gemini-2.5-flash-lite-preview-06-17', label: 'gemini-2.5-flash-lite-preview-06-17' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-pro-preview-03-25', label: 'gemini-2.5-pro-preview-03-25' },
    { value: 'gemini-2.5-pro-preview-05-06', label: 'gemini-2.5-pro-preview-05-06' },
    { value: 'gemini-2.5-pro-preview-06-05', label: 'gemini-2.5-pro-preview-06-05' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
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
