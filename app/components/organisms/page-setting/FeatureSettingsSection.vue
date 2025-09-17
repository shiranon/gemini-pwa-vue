<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="機能設定"
    description="アプリケーションの動作設定"
  >
    <SettingToggle
      :model-value="localSettings.streamingOutput"
      label="ストリーミング出力"
      description="応答をリアルタイムで表示"
      @update:model-value="(value: boolean) => updateSetting('streamingOutput', value)"
    />

    <SettingToggle
      :model-value="localSettings.geminiEnableGrounding"
      label="Google Search"
      description="Google Searchによる情報取得を有効化"
      @update:model-value="localSettings.geminiEnableGrounding = $event"
    />

    <SettingToggle
      v-model="localSettings.hideSystemPromptInChat"
      label="チャットでシステムプロンプトを非表示"
      description="チャット画面でシステムプロンプトを隠す"
    />

    <SettingToggle
      v-model="localSettings.enterToSend"
      label="Enterで送信"
      description="Enterキーでメッセージを送信"
      disabled
    />

    <SettingToggle
      :model-value="localSettings.enableAutoRetry"
      label="自動リトライ"
      description="エラー時の自動リトライを有効化"
      @update:model-value="(value: boolean) => updateSetting('enableAutoRetry', value)"
    />
  </SettingSection>
</template>

<script setup lang="ts">
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'

export interface FeatureSettingsSectionProps {
  localSettings: AppSettings
}

defineProps<FeatureSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  emit('update-setting', key, value)
}
</script>
