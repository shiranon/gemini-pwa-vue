<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="ダミープロンプト"
    description="API送信直前に履歴末尾へ一時的に挿入されます。履歴には保存されません。"
  >
    <SettingToggle
      :model-value="localSettings.enableDummyUserPrompt"
      label="DummyUserプロンプトを有効にする"
      description="ユーザーの直近の指示の直後に追記されます"
      @update:model-value="(v: boolean) => updateSetting('enableDummyUserPrompt', v)"
    />
    <div class="md:col-span-2">
      <SettingItem
        name="dummyUserPrompt"
        label="DummyUserプロンプト"
      >
        <Textarea
          v-model="localSettings.dummyUserPrompt"
          :rows="3"
          placeholder="上記指示に従ってください。"
        />
      </SettingItem>
    </div>

    <SettingToggle
      :model-value="localSettings.enableDummyModelPrompt"
      label="DummyModelプロンプトを有効にする（プレフィル）"
      description="モデルの直近発話として擬似的に差し込み、続きの出力を誘導します"
      @update:model-value="(v: boolean) => updateSetting('enableDummyModelPrompt', v)"
    />

    <div class="md:col-span-2">
      <SettingItem
        name="dummyModelPrompt"
        label="DummyModelプロンプト"
      >
        <Textarea
          v-model="localSettings.dummyModelPrompt"
          :rows="3"
          placeholder="はい、私は小説家として指示された内容を忠実に執筆します。それでは以下が本文となります。"
        />
      </SettingItem>
    </div>

    <SettingToggle
      :model-value="localSettings.prependDummyModelToResponse"
      label="DummyModelと回答を連結（保存時に先頭へ付与）"
      description="保存されたモデルの回答の先頭にダミーModelを結合し、メッセージを一つに見せます"
      @update:model-value="(v: boolean) => updateSetting('prependDummyModelToResponse', v)"
    />
  </SettingSection>
</template>

<script setup lang="ts">
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { Textarea } from '~/components/ui/textarea'

export interface DummyPromptSettingsSectionProps {
  localSettings: AppSettings
}

defineProps<DummyPromptSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  emit('update-setting', key, value)
}
</script>
