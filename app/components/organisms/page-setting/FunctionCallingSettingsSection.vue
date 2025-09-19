<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="Function Calling設定"
    description="AI関数呼び出し機能の設定"
  >
    <div class="flex flex-col gap-4">
      <SettingToggle
        :model-value="props.localSettings.geminiEnableFunctionCalling"
        label="Function Calling"
        description="AI関数呼び出し機能"
        @update:model-value="(value: boolean) => updateSetting('geminiEnableFunctionCalling', value)"
      />

      <div class="space-y-3">
        <div
          v-if="toolOptions.length > 0"
          class="text-muted-foreground text-xs"
        >
          利用するツールを選択（{{ selectedCount }} / {{ toolOptions.length }}）
        </div>

        <div
          v-if="toolOptions.length > 0"
          class="flex flex-col gap-3"
        >
          <SettingToggle
            v-for="tool in toolOptions"
            :key="tool.name"
            :model-value="selectedToolNameSet.has(tool.name)"
            :label="tool.displayName"
            :description="tool.description"
            @update:model-value="(checked: boolean) => handleToolToggle(tool.name, checked)"
          >
            <template #help>
              <div
                v-if="tool.tags.length > 0"
                class="flex flex-wrap gap-1"
              >
                <span
                  v-for="tag in tool.tags"
                  :key="`${tool.name}-tag-${tag}`"
                  class="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-0.5 text-[10px]"
                >
                  {{ tag }}
                </span>
              </div>
              <p
                v-if="tool.argsHint"
                class="mt-1"
              >
                引数ヒント: {{ tool.argsHint }}
              </p>
              <p
                v-if="tool.contextHint"
                class="mt-1"
              >
                コンテキスト: {{ tool.contextHint }}
              </p>
              <p
                v-if="tool.defaultEnabled === false"
                class="text-muted-foreground mt-1 text-[10px]"
              >
                デフォルトでは無効化されています。
              </p>
            </template>
          </SettingToggle>
        </div>

        <p
          v-else
          class="text-muted-foreground text-xs"
        >
          利用可能なFunction Callingツールが登録されていません。
        </p>

        <p
          v-if="!props.localSettings.geminiEnableFunctionCalling"
          class="text-muted-foreground text-xs"
        >
          Function Callingを有効化すると、選択したツールのみがGeminiへ公開されます。
        </p>
      </div>
    </div>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { computeNextEnabledFunctionTools } from '~/utils/selection'

export interface FunctionCallingSettingsSectionProps {
  localSettings: AppSettings
}

const props = defineProps<FunctionCallingSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const { functionRegistry } = useFunctionCalling()

interface ToolOption {
  name: string
  displayName: string
  description: string
  tags: string[]
  argsHint?: string
  contextHint?: string
  defaultEnabled?: boolean
}

const toolOptions = computed<ToolOption[]>(() => {
  return Array.from(functionRegistry.entries()).map(([name, entry]) => ({
    name,
    displayName: entry.meta?.displayName ?? name,
    description: entry.meta?.description ?? entry.declaration.description ?? '',
    tags: entry.meta?.tags ? [...entry.meta.tags] : [],
    argsHint: entry.meta?.argsHint,
    contextHint: entry.meta?.contextHint,
    defaultEnabled: entry.meta?.defaultEnabled,
  }))
})

const selectedToolNames = computed(() => props.localSettings.enabledFunctionTools ?? [])
const selectedToolNameSet = computed(() => new Set(selectedToolNames.value))
const selectedCount = computed(() => selectedToolNames.value.length)

const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
  emit('update-setting', key, value)
}

const handleToolToggle = (toolName: string, enabled: boolean) => {
  const orderedNames = toolOptions.value.map((tool) => tool.name)
  const nextSelection = computeNextEnabledFunctionTools(selectedToolNames.value, toolName, enabled, orderedNames)
  emit('update-setting', 'enabledFunctionTools', nextSelection as AppSettings['enabledFunctionTools'])
}
</script>
