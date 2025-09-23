<template>
  <SettingSection
    title="API設定"
    description="Gemini APIの接続設定"
  >
    <SettingItem
      name="apiKey"
      label="APIキー"
      required
      :show-status-indicator="true"
      :is-valid="isValidApiKey"
      valid-message="APIキーが設定されています"
      invalid-message="APIキーが必要です"
    >
      <Input
        :model-value="localSettings.apiKey"
        type="password"
        placeholder="AIzaSy..."
        :class="{
          'border-destructive': !isValidApiKey,
        }"
        @update:model-value="(value: string | number) => emit('update-setting', 'apiKey', String(value))"
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
            v-for="option in modelOptions"
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

const isValidApiKey = computed(() => {
  return props.localSettings.apiKey.length > 0
})

const { modelOptions } = useGeminiModelOptions(computed(() => props.localSettings.apiKey))
</script>
