<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="API設定"
    description="Gemini APIの接続設定"
  >
    <SettingItem
      name="apiKey"
      label="APIキー"
      description="Google AI StudioからGemini APIキーを取得してください"
      required
      :show-status-indicator="true"
      :is-valid="isValidApiKey"
      valid-message="APIキーが設定されています"
      invalid-message="APIキーが必要です"
    >
      <Input
        v-model="localSettings.apiKey"
        type="password"
        placeholder="AIzaSy..."
        :class="{
          'border-destructive': !isValidApiKey,
        }"
      />
    </SettingItem>

    <SettingItem
      name="modelName"
      label="モデル名"
    >
      <Select v-model="localSettings.modelName">
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
          v-model="localSettings.systemPrompt"
          placeholder="あなたはTRPGのゲームマスターです..."
          :rows="6"
        />
      </SettingItem>
    </div>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useGeminiModelOptions } from '~/composables/useGeminiModelOptions'

export interface ApiSettingsSectionProps {
  localSettings: AppSettings
}

const props = defineProps<ApiSettingsSectionProps>()

const isValidApiKey = computed(() => {
  return props.localSettings.apiKey.length > 0
})

const { modelOptions } = useGeminiModelOptions(computed(() => props.localSettings.apiKey))
</script>
