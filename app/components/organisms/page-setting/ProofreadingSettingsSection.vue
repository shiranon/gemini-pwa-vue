<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="校正機能設定"
    description="文章校正機能の詳細設定"
  >
    <SettingToggle
      :model-value="localSettings.enableProofreading"
      label="校正機能"
      description="文章校正機能を有効化"
      @update:model-value="localSettings.enableProofreading = $event"
    />

    <SettingItem
      name="proofreadingModelName"
      label="校正用モデル"
      description="文章校正に使用するモデル"
      :disabled="!localSettings.enableProofreading"
    >
      <Select
        :model-value="localSettings.proofreadingModelName"
        :disabled="!localSettings.enableProofreading"
        @update:model-value="localSettings.proofreadingModelName = $event as string"
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
        name="proofreadingSystemInstruction"
        label="校正用システムプロンプト"
        description="校正機能のシステム指示"
        :disabled="!localSettings.enableProofreading"
      >
        <Textarea
          :model-value="localSettings.proofreadingSystemInstruction"
          placeholder="文章を校正してください..."
          :rows="3"
          :disabled="!localSettings.enableProofreading"
          @update:model-value="localSettings.proofreadingSystemInstruction = $event as string"
        />
      </SettingItem>
    </div>

    <div
      v-if="localSettings.enableProofreading"
      class="border-primary/40 bg-primary/10 text-foreground rounded-md border p-3 text-sm md:col-span-2"
    >
      <div class="text-primary flex items-center gap-2">
        <Icon
          icon="material-symbols:spellcheck"
          class="h-4 w-4"
        />
        <span class="font-medium">校正機能について</span>
      </div>
      <p class="text-muted-foreground mt-1">AI生成テキストの文法、表現、語彙などを自動的に校正します。校正用モデルとシステムプロンプトを設定できます。</p>
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

export interface ProofreadingSettingsSectionProps {
  localSettings: AppSettings
}

const props = defineProps<ProofreadingSettingsSectionProps>()

const { modelOptions } = useGeminiModelOptions(computed(() => props.localSettings.apiKey))
</script>
