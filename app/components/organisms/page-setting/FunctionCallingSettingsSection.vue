<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="Function Calling設定"
    description="AI関数呼び出し機能の設定"
  >
    <SettingToggle
      :model-value="localSettings.geminiEnableFunctionCalling"
      label="Function Calling"
      description="AI関数呼び出し機能"
      @update:model-value="(value: boolean) => updateSetting('geminiEnableFunctionCalling', value)"
    />
  </SettingSection>
</template>

<script setup lang="ts">
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'

export interface FunctionCallingSettingsSectionProps {
  localSettings: AppSettings
}

defineProps<FunctionCallingSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  emit('update-setting', key, value)
}
</script>
