<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="パフォーマンス設定"
    description="生成パラメータとパフォーマンス調整"
  >
    <SettingItem
      name="temperature"
      label="Temperature"
      description="応答のランダム性 (0.0: 決定的, 2.0: より創造的)"
      :value="localSettings.temperature ?? 1.0"
      show-value
      :value-formatter="(v) => String(v)"
    >
      <Slider
        :model-value="[localSettings.temperature ?? 1.0]"
        :min="0"
        :max="2"
        :step="0.1"
        @update:model-value="(value: number[] | undefined) => updateSetting('temperature', value?.[0] ?? 1.0)"
      />
    </SettingItem>

    <SettingItem
      name="maxTokens"
      label="最大トークン数"
    >
      <Input
        :model-value="localSettings.maxTokens ?? undefined"
        type="number"
        placeholder="制限なし"
        :min="1"
        :max="32768"
        @update:model-value="(value: string | number | null) => updateSetting('maxTokens', value ? (typeof value === 'number' ? value : Number(value)) : null)"
      />
    </SettingItem>

    <SettingItem
      name="topK"
      label="Top-K"
      :value="localSettings.topK ?? 1"
      show-value
    >
      <Slider
        :model-value="[localSettings.topK ?? 1]"
        :min="1"
        :max="40"
        :step="1"
        @update:model-value="(value: number[] | undefined) => updateSetting('topK', value?.[0] ?? 1)"
      />
    </SettingItem>

    <SettingItem
      name="topP"
      label="Top-P"
      :value="localSettings.topP ?? 0.95"
      show-value
      :value-formatter="(v) => String(v)"
    >
      <Slider
        :model-value="[localSettings.topP ?? 0.95]"
        :min="0"
        :max="1"
        :step="0.05"
        @update:model-value="(value: number[] | undefined) => updateSetting('topP', value?.[0] ?? 0.95)"
      />
    </SettingItem>

    <SettingItem
      name="presencePenalty"
      label="Presence Penalty"
      description="同じトピックの反復を制御 (-2.0: 反復増加, 2.0: 反復減少)"
      :value="localSettings.presencePenalty ?? 0.0"
      show-value
      :value-formatter="(v) => String(v)"
    >
      <Slider
        :model-value="[localSettings.presencePenalty ?? 0.0]"
        :min="-2"
        :max="2"
        :step="0.1"
        @update:model-value="(value: number[] | undefined) => updateSetting('presencePenalty', value?.[0] ?? 0.0)"
      />
    </SettingItem>

    <SettingItem
      name="frequencyPenalty"
      label="Frequency Penalty"
      description="単語の出現頻度制御 (-2.0: 頻出増加, 2.0: 頻出減少)"
      :value="localSettings.frequencyPenalty ?? 0.0"
      show-value
      :value-formatter="(v) => String(v)"
    >
      <Slider
        :model-value="[localSettings.frequencyPenalty ?? 0.0]"
        :min="-2"
        :max="2"
        :step="0.1"
        @update:model-value="(value: number[] | undefined) => updateSetting('frequencyPenalty', value?.[0] ?? 0.0)"
      />
    </SettingItem>

    <SettingToggle
      :model-value="localSettings.enableThinking"
      label="思考機能有効化"
      description="AIの思考機能を有効化"
      @update:model-value="(value: boolean) => updateSetting('enableThinking', value)"
    />

    <SettingToggle
      :model-value="localSettings.includeThoughts"
      label="思考プロセス表示"
      description="AIの思考過程を表示"
      @update:model-value="(value: boolean) => updateSetting('includeThoughts', value)"
    />

    <SettingItem
      name="thinkingBudget"
      label="Thinking Budget"
      description="思考プロセス用のトークン予算 (-1: 自動, 0: 無効)"
      :disabled="!localSettings.enableThinking"
    >
      <Input
        :model-value="localSettings.thinkingBudget ?? undefined"
        type="number"
        placeholder="自動 (-1)"
        :min="-1"
        :max="32768"
        :disabled="!localSettings.enableThinking"
        @update:model-value="(value: string | number | null) => updateSetting('thinkingBudget', value ? (typeof value === 'number' ? value : Number(value)) : null)"
      />
    </SettingItem>
  </SettingSection>
</template>

<script setup lang="ts">
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { Input } from '~/components/ui/input'
import { Slider } from '~/components/ui/slider'

export interface PerformanceSettingsSectionProps {
  localSettings: AppSettings
}

defineProps<PerformanceSettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  emit('update-setting', key, value)
}
</script>
