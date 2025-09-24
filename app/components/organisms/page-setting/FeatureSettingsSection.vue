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
      :model-value="localProfileSettings.geminiEnableGrounding"
      label="Google Search"
      description="Google Searchによる情報取得を有効化"
      @update:model-value="(value: boolean) => updateProfileSetting('geminiEnableGrounding', value)"
    />

    <SettingToggle
      :model-value="localSettings.hideSystemPromptInChat"
      label="チャットでシステムプロンプトを非表示"
      description="チャット画面でシステムプロンプトを隠す"
      @update:model-value="(value: boolean) => updateSetting('hideSystemPromptInChat', value)"
    />

    <SettingToggle
      :model-value="localSettings.enterToSend"
      label="Enterで送信"
      description="Enterキーでメッセージを送信"
      @update:model-value="(value: boolean) => updateSetting('enterToSend', value)"
    />

    <SettingToggle
      :model-value="localSettings.enableAutoRetry"
      label="自動リトライ"
      description="エラー時の自動リトライを有効化"
      @update:model-value="(value: boolean) => updateSetting('enableAutoRetry', value)"
    />
    <SettingToggle
      :model-value="localSettings.enableSwipeNavigation"
      label="スワイプナビゲーション"
      description="スワイプジェスチャーでのナビゲーションを有効化(未実装)"
      disabled
      @update:model-value="(value: boolean) => updateSetting('enableSwipeNavigation', value)"
    />
  </SettingSection>
</template>

<script setup lang="ts">
import type { AppSettings, SettingsProfileData } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'

export interface FeatureSettingsSectionProps {
  localSettings: AppSettings
  localProfileSettings: SettingsProfileData
}

defineProps<FeatureSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
  'update-profile-setting': [key: keyof SettingsProfileData, value: SettingsProfileData[keyof SettingsProfileData]]
}>()

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  emit('update-setting', key, value)
}

const updateProfileSetting = (key: keyof SettingsProfileData, value: SettingsProfileData[keyof SettingsProfileData]) => {
  emit('update-profile-setting', key, value)
}
</script>
