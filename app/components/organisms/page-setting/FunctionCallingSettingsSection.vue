<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="Function Calling設定"
    description="AI関数呼び出し機能の設定"
    single-column
  >
    <div class="flex flex-col gap-4">
      <SettingToggle
        :model-value="props.localSettings.geminiEnableFunctionCalling"
        label="Function Calling"
        description="AI関数呼び出し機能"
        @update:model-value="(value: boolean) => updateSetting('geminiEnableFunctionCalling', value)"
      />

      <div
        v-if="props.localSettings.geminiEnableFunctionCalling"
        class="mt-4 space-y-3"
      >
        <div class="border-border text-muted-foreground border-t-1 pt-2 text-xs">関数呼び出しモード</div>

        <div class="flex flex-col gap-2">
          <label class="flex cursor-pointer items-center space-x-3">
            <input
              :checked="props.localSettings.functionCallingMode === 'auto'"
              type="radio"
              name="functionCallingMode"
              value="AUTO"
              class="text-primary focus:ring-primary h-4 w-4 border-gray-300"
              @change="updateSetting('functionCallingMode', 'auto')"
            />
            <div class="flex-1">
              <div class="text-sm font-medium">AUTO（自動）</div>
              <div class="text-muted-foreground text-xs">モデルが関数呼び出しか、自然言語応答かを自動で決定します。</div>
            </div>
          </label>
          <label class="flex cursor-pointer items-center space-x-3">
            <input
              :checked="props.localSettings.functionCallingMode === 'any'"
              type="radio"
              name="functionCallingMode"
              value="any"
              class="text-primary focus:ring-primary h-4 w-4 border-gray-300"
              @change="updateSetting('functionCallingMode', 'any')"
            />
            <div class="flex-1">
              <div class="text-sm font-medium">ANY（強制関数呼び出し）</div>
              <div class="text-muted-foreground text-xs">必ず関数呼び出しを行います。</div>
            </div>
          </label>
          <label class="flex cursor-pointer items-center space-x-3">
            <input
              :checked="props.localSettings.functionCallingMode === 'none'"
              type="radio"
              name="functionCallingMode"
              value="none"
              class="text-primary focus:ring-primary h-4 w-4 border-gray-300"
              @change="updateSetting('functionCallingMode', 'none')"
            />
            <div class="flex-1">
              <div class="text-sm font-medium">NONE</div>
              <div class="text-muted-foreground text-xs">関数を呼び出しません。</div>
            </div>
          </label>
        </div>
      </div>

      <div class="mt-2 space-y-3">
        <div
          v-if="toolOptions.length > 0"
          class="border-border text-muted-foreground border-t-1 pt-2 text-xs"
        >
          利用するツールを選択（{{ selectedCount }} / {{ toolOptions.length }}）
        </div>

        <div
          v-if="toolOptions.length > 0"
          class="grid grid-cols-1 items-start gap-4 px-2 md:grid-cols-2 md:gap-8"
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
