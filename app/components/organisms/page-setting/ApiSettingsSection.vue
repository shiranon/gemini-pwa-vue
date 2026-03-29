<template>
  <SettingSection
    title="API設定"
    :description="apiDescription"
  >
    <SettingItem
      name="apiProvider"
      label="APIプロバイダー"
      description="使用するAI APIを選択"
    >
      <Select
        :model-value="apiProvider"
        @update:model-value="(value: AcceptableValue) => updateProfileSetting('apiProvider', String(value))"
      >
        <SelectTrigger>
          <SelectValue placeholder="プロバイダーを選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gemini"> Google Gemini </SelectItem>
          <SelectItem value="openai"> OpenAI </SelectItem>
          <SelectItem value="claude"> Anthropic Claude </SelectItem>
          <SelectItem value="ollama"> Ollama (Local) </SelectItem>
        </SelectContent>
      </Select>
    </SettingItem>

    <SettingItem
      v-if="apiProvider === 'gemini'"
      name="apiKey"
      label="Gemini APIキー"
      required
      :show-status-indicator="true"
      :is-valid="isValidGeminiApiKey"
      valid-message="APIキーが設定されています"
      invalid-message="APIキーが必要です"
    >
      <Input
        :model-value="localSettings.apiKey"
        type="password"
        placeholder="AIzaSy..."
        :class="{
          'border-destructive': !isValidGeminiApiKey,
        }"
        @update:model-value="(value: string | number) => emit('update-setting', 'apiKey', String(value))"
      />
    </SettingItem>

    <SettingItem
      v-if="apiProvider === 'openai'"
      name="openaiApiKey"
      label="OpenAI APIキー"
      required
      :show-status-indicator="true"
      :is-valid="isValidOpenAiApiKey"
      valid-message="APIキーが設定されています"
      invalid-message="APIキーが必要です"
    >
      <Input
        :model-value="localSettings.openaiApiKey"
        type="password"
        placeholder="sk-..."
        :class="{
          'border-destructive': !isValidOpenAiApiKey,
        }"
        @update:model-value="(value: string | number) => emit('update-setting', 'openaiApiKey', String(value))"
      />
    </SettingItem>

    <SettingItem
      v-if="apiProvider === 'claude'"
      name="claudeApiKey"
      label="Claude APIキー"
      required
      :show-status-indicator="true"
      :is-valid="isValidClaudeApiKey"
      valid-message="APIキーが設定されています"
      invalid-message="APIキーが必要です"
    >
      <Input
        :model-value="localSettings.claudeApiKey"
        type="password"
        placeholder="sk-ant-..."
        :class="{
          'border-destructive': !isValidClaudeApiKey,
        }"
        @update:model-value="(value: string | number) => emit('update-setting', 'claudeApiKey', String(value))"
      />
    </SettingItem>

    <SettingItem
      v-if="apiProvider === 'ollama'"
      name="ollamaBaseUrl"
      label="Ollama ベースURL"
      description="OllamaサーバーのURL"
    >
      <div class="flex gap-2">
        <Input
          :model-value="localSettings.ollamaBaseUrl || 'http://localhost:11434'"
          type="text"
          placeholder="http://localhost:11434"
          class="flex-1"
          @update:model-value="(value: string | number) => emit('update-setting', 'ollamaBaseUrl', String(value || 'http://localhost:11434'))"
        />
        <Button
          variant="outline"
          size="sm"
          :disabled="ollamaLoadingModels"
          @click="fetchOllamaModels"
        >
          {{ ollamaLoadingModels ? '接続中...' : '接続テスト' }}
        </Button>
      </div>
      <p
        v-if="ollamaConnectionError"
        class="text-destructive mt-1 text-xs"
      >
        {{ ollamaConnectionError }}
      </p>
      <p
        v-else-if="ollamaModelOptions.length > 0"
        class="text-muted-foreground mt-1 text-xs"
      >
        {{ ollamaModelOptions.length }}個のモデルが見つかりました
      </p>
    </SettingItem>

    <SettingItem
      v-if="apiProvider === 'ollama'"
      name="ollamaApiKey"
      label="APIキー (任意)"
      description="認証が必要な場合のみ"
    >
      <Input
        :model-value="localSettings.ollamaApiKey"
        type="password"
        placeholder="不要な場合は空欄"
        @update:model-value="(value: string | number) => emit('update-setting', 'ollamaApiKey', String(value))"
      />
    </SettingItem>

    <SettingItem
      name="modelName"
      label="モデル名"
    >
      <Select
        :model-value="localProfileSettings.modelName"
        @update:model-value="(value: AcceptableValue) => updateProfileSetting('modelName', String(value || ''))"
      >
        <SelectTrigger>
          <SelectValue placeholder="モデルを選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in currentModelOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </SettingItem>

    <div class="md:col-span-2">
      <SettingItem
        name="systemPrompt"
        label="システムプロンプト"
        description="AIの役割や振る舞いを定義します"
      >
        <Textarea
          :model-value="localProfileSettings.systemPrompt"
          placeholder="あなたはTRPGのゲームマスターです..."
          :rows="6"
          @update:model-value="(value: string | number) => updateProfileSetting('systemPrompt', String(value))"
        />
      </SettingItem>
    </div>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AcceptableValue } from 'reka-ui'
import type { AppSettings, SettingsProfileData } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useGeminiModelOptions } from '~/composables/useGeminiModelOptions'
import { useOllamaModelOptions } from '~/composables/useOllamaModelOptions'
import { useClaudeModelOptions } from '~/composables/useClaudeModelOptions'

export interface ApiSettingsSectionProps {
  localSettings: AppSettings
  localProfileSettings: SettingsProfileData
}

const props = defineProps<ApiSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
  'update-profile-setting': [key: keyof SettingsProfileData, value: SettingsProfileData[keyof SettingsProfileData]]
}>()

const updateProfileSetting = (key: keyof SettingsProfileData, value: SettingsProfileData[keyof SettingsProfileData]) => {
  emit('update-profile-setting', key, value)
}

const apiProvider = computed(() => props.localProfileSettings.apiProvider)

const apiDescription = computed(() => {
  switch (apiProvider.value) {
    case 'gemini':
      return 'Gemini APIの接続設定'
    case 'claude':
      return 'Claude APIの接続設定'
    case 'openai':
      return 'OpenAI APIの接続設定'
    case 'ollama':
      return 'Ollama (ローカルLLM) の接続設定'
    default:
      return 'API接続設定'
  }
})

const isValidGeminiApiKey = computed(() => {
  const key = props.localSettings.apiKey
  return key.length > 0 && key.startsWith('AIzaSy')
})

const isValidOpenAiApiKey = computed(() => {
  const key = props.localSettings.openaiApiKey
  return key.length > 0 && key.startsWith('sk-')
})

const isValidClaudeApiKey = computed(() => {
  const key = props.localSettings.claudeApiKey
  return key.length > 0 && key.startsWith('sk-ant-')
})

const { modelOptions: geminiModelOptions } = useGeminiModelOptions(computed(() => props.localSettings.apiKey))

// Ollamaモデルのオプション
const {
  modelOptions: ollamaModelOptions,
  loadingModels: ollamaLoadingModels,
  connectionError: ollamaConnectionError,
  fetchModels: fetchOllamaModels,
} = useOllamaModelOptions(computed(() => props.localSettings.ollamaBaseUrl))

// OpenAIモデルのオプション
const openaiModelOptions = computed(() => [
  // GPT-5 Series (最新)
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-5.4-pro', label: 'GPT-5.4 Pro' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
  { value: 'gpt-5', label: 'GPT-5' },
  // Reasoning Models
  { value: 'o3', label: 'o3' },
  { value: 'o3-pro', label: 'o3 Pro' },
  { value: 'o4-mini', label: 'o4 Mini' },
  // GPT-4 Series
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
])

// Claudeモデルのオプション（API動的取得）
const { modelOptions: claudeModelOptions } = useClaudeModelOptions(computed(() => props.localSettings.claudeApiKey))

const currentModelOptions = computed(() => {
  if (apiProvider.value === 'openai') return openaiModelOptions.value
  if (apiProvider.value === 'claude') return claudeModelOptions.value
  if (apiProvider.value === 'ollama') return ollamaModelOptions.value
  return geminiModelOptions.value
})
</script>
