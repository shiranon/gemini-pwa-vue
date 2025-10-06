<template>
  <SettingSection
    title="要約機能設定"
    description="チャット要約機能の詳細設定"
    :default-open="false"
  >
    <SettingToggle
      :model-value="localSettings.enableSummary"
      label="要約機能"
      description="チャット要約機能を有効化"
      @update:model-value="updateSetting('enableSummary', $event)"
    />

    <SettingItem
      name="summaryModelName"
      label="要約用モデル"
      description="チャット要約に使用するモデル"
      :disabled="!localSettings.enableSummary"
    >
      <Select
        :model-value="localSettings.summaryModelName"
        :disabled="!localSettings.enableSummary"
        @update:model-value="updateSetting('summaryModelName', $event as string)"
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
        name="summarySystemInstruction"
        label="要約用システムプロンプト"
        description="要約機能のシステム指示"
        :disabled="!localSettings.enableSummary"
      >
        <Textarea
          :model-value="localSettings.summarySystemInstruction"
          placeholder="会話履歴を要約してください..."
          :rows="3"
          :disabled="!localSettings.enableSummary"
          @update:model-value="updateSetting('summarySystemInstruction', $event as string)"
        />
      </SettingItem>
    </div>

    <div
      v-if="localSettings.enableSummary"
      class="border-primary/40 bg-primary/10 text-foreground rounded-md border p-3 text-sm md:col-span-2"
    >
      <div class="text-primary flex items-center gap-2">
        <Icon
          icon="material-symbols:summarize"
          class="h-4 w-4"
        />
        <span class="font-medium">要約機能について</span>
      </div>
      <p class="text-muted-foreground mt-1">チャット履歴を任意のタイミングで要約し、アシスタントメッセージとして保存します。要約後は、要約メッセージ以降の履歴のみが送信対象となります。</p>
    </div>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppSettings } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Icon } from '@iconify/vue'
import { useGeminiModelOptions } from '~/composables/useGeminiModelOptions'

export interface SummarySettingsSectionProps {
  localSettings: AppSettings
}

const props = defineProps<SummarySettingsSectionProps>()

const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const { modelOptions } = useGeminiModelOptions(computed(() => props.localSettings.apiKey))

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  emit('update-setting', key, value)
}
</script>
