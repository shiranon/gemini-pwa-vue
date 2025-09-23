<template>
  <SettingSection
    title="ダミープロンプト"
    description="API送信直前に履歴末尾へ一時的に挿入されます。履歴には保存されません。"
  >
    <SettingToggle
      :model-value="localProfileSettings.enableDummyUserPrompt"
      label="DummyUserプロンプトを有効にする"
      description="ユーザーの直近の指示の直後に追記されます"
      @update:model-value="(v: boolean) => updateProfileSetting('enableDummyUserPrompt', v)"
    />
    <div class="md:col-span-2">
      <SettingItem
        name="dummyUserPrompt"
        label="DummyUserプロンプト"
      >
        <Textarea
          :model-value="localProfileSettings.dummyUserPrompt"
          :rows="3"
          placeholder="上記指示に従ってください。"
          @update:model-value="(value: string | number) => updateProfileSetting('dummyUserPrompt', String(value))"
        />
      </SettingItem>
    </div>

    <SettingToggle
      :model-value="localProfileSettings.enableDummyModelPrompt"
      label="DummyModelプロンプトを有効にする（プレフィル）"
      description="モデルの直近発話として擬似的に差し込み、続きの出力を誘導します"
      @update:model-value="(v: boolean) => updateProfileSetting('enableDummyModelPrompt', v)"
    />

    <div class="md:col-span-2">
      <SettingItem
        name="dummyModelPrompt"
        label="DummyModelプロンプト"
      >
        <Textarea
          :model-value="localProfileSettings.dummyModelPrompt"
          :rows="3"
          placeholder="はい、私は小説家として指示された内容を忠実に執筆します。それでは以下が本文となります。"
          @update:model-value="(value: string | number) => updateProfileSetting('dummyModelPrompt', String(value))"
        />
      </SettingItem>
    </div>

    <SettingToggle
      :model-value="localProfileSettings.prependDummyModelToResponse"
      label="DummyModelと回答を連結（保存時に先頭へ付与）"
      description="保存されたモデルの回答の先頭にダミーModelを結合し、メッセージを一つに見せます"
      @update:model-value="(v: boolean) => updateProfileSetting('prependDummyModelToResponse', v)"
    />
  </SettingSection>
</template>

<script setup lang="ts">
import type { AppSettings, SettingsProfileData } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { Textarea } from '~/components/ui/textarea'

export interface DummyPromptSettingsSectionProps {
  localSettings: AppSettings
  localProfileSettings: SettingsProfileData
}

defineProps<DummyPromptSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
  'update-profile-setting': [key: keyof SettingsProfileData, value: SettingsProfileData[keyof SettingsProfileData]]
}>()

const updateProfileSetting = (key: keyof SettingsProfileData, value: SettingsProfileData[keyof SettingsProfileData]) => {
  emit('update-profile-setting', key, value)
}
</script>
