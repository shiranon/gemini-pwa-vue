<template>
  <SettingSection
    title="API設定"
    :description="apiProvider === 'gemini' ? 'Gemini APIの接続設定' : 'OpenAI APIの接続設定'"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useGeminiModelOptions } from '~/composables/useGeminiModelOptions'

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

const isValidGeminiApiKey = computed(() => {
  return props.localSettings.apiKey.length > 0
})

const isValidOpenAiApiKey = computed(() => {
  return props.localSettings.openaiApiKey.length > 0
})

const { modelOptions: geminiModelOptions } = useGeminiModelOptions(computed(() => props.localSettings.apiKey))

// OpenAIモデルのオプション
const openaiModelOptions = computed(() => [
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'o1', label: 'o1' },
  { value: 'o1-mini', label: 'o1 Mini' },
])

const currentModelOptions = computed(() => {
  return apiProvider.value === 'openai' ? openaiModelOptions.value : geminiModelOptions.value
})
</script>
