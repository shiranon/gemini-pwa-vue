<template>
  <SettingSection
    title="思考プロセス翻訳設定"
    description="AI思考プロセスの翻訳機能と詳細設定"
  >
    <SettingToggle
      :model-value="localSettings.enableThoughtTranslation"
      label="思考プロセス翻訳"
      description="日本語翻訳を有効化(思考プロセス表示有効化時のみ)"
      :disabled="!localSettings.includeThoughts"
      @update:model-value="updateSetting('enableThoughtTranslation', $event)"
    />

    <SettingItem
      name="thoughtTranslationProvider"
      label="翻訳プロバイダ"
      description="Gemini または DeepL を選択"
      :disabled="!localSettings.enableThoughtTranslation"
    >
      <Select
        :model-value="localSettings.thoughtTranslationProvider"
        :disabled="!localSettings.enableThoughtTranslation"
        @update:model-value="updateSetting('thoughtTranslationProvider', $event as 'gemini' | 'deepl')"
      >
        <SelectTrigger>
          <SelectValue placeholder="翻訳プロバイダを選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gemini">Gemini</SelectItem>
          <SelectItem value="deepl">DeepL</SelectItem>
        </SelectContent>
      </Select>
    </SettingItem>

    <SettingItem
      name="thoughtTranslationModel"
      label="翻訳用モデル"
      description="思考プロセス翻訳に使用するモデル"
      :disabled="!localSettings.enableThoughtTranslation || localSettings.thoughtTranslationProvider !== 'gemini'"
    >
      <Select
        :model-value="localSettings.thoughtTranslationModel"
        :disabled="!localSettings.enableThoughtTranslation || localSettings.thoughtTranslationProvider !== 'gemini'"
        @update:model-value="updateSetting('thoughtTranslationModel', $event as string)"
      >
        <SelectTrigger>
          <SelectValue placeholder="翻訳用モデルを選択" />
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

    <SettingItem
      v-if="localSettings.enableThoughtTranslation && localSettings.thoughtTranslationProvider === 'deepl'"
      name="deeplApiKey"
      label="DeepL APIキー"
      description="DeepLのAPIキーを入力"
    >
      <Input
        :model-value="localSettings.deeplApiKey"
        type="password"
        placeholder="DEEPL-..."
        @update:model-value="(value: string | number) => emit('update-setting', 'deeplApiKey', String(value))"
      />
    </SettingItem>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Input } from '~/components/ui/input'
import { useGeminiModelOptions } from '~/composables/useGeminiModelOptions'

export interface ThoughtTranslationSettingsSectionProps {
  localSettings: AppSettings
}

const props = defineProps<ThoughtTranslationSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const { modelOptions } = useGeminiModelOptions(computed(() => props.localSettings.apiKey))

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  emit('update-setting', key, value)
}
</script>
