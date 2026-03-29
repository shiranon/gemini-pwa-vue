import { onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useClaudeApi } from '~/composables/useClaudeApi'
import { logger } from '~/lib/logger'
import type { ModelOption } from '~/composables/useGeminiModelOptions'

export interface UseClaudeModelOptionsReturn {
  modelOptions: Ref<ModelOption[]>
  loadingModels: Ref<boolean>
  fetchModels: () => Promise<void>
}

/**
 * Claudeモデルの候補を取得し、<Select>用の options 配列として提供する
 * - apiKey の変更を監視して自動で再取得
 * - API取得失敗時は固定リストにフォールバック
 */
export function useClaudeModelOptions(apiKey: ComputedRef<string> | Ref<string>): UseClaudeModelOptionsReturn {
  const claudeApi = useClaudeApi()

  const modelOptions = ref<ModelOption[]>([])
  const loadingModels = ref(false)

  const fetchModels = async () => {
    const key = typeof apiKey.value === 'string' ? apiKey.value : ''
    try {
      loadingModels.value = true
      const names = await claudeApi.getAvailableModels(key)
      if (Array.isArray(names) && names.length > 0) {
        modelOptions.value = names.map((n) => ({ value: n, label: n }))
      } else {
        modelOptions.value = []
      }
    } catch (error) {
      logger.error('Claudeモデルの読み込みに失敗:', { component: 'useClaudeModelOptions' }, error)
      modelOptions.value = []
    } finally {
      loadingModels.value = false
    }
  }

  watch(
    () => apiKey.value,
    async (newKey, oldKey) => {
      if (newKey !== oldKey) await fetchModels()
    }
  )

  onMounted(async () => {
    await fetchModels()
  })

  return {
    modelOptions,
    loadingModels,
    fetchModels,
  }
}
