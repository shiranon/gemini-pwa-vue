<template>
  <SettingSection
    title="テーマ設定"
    description="アプリ全体のカラーパレットをプリセットから選択"
    single-column
    :default-open="false"
  >
    <SettingItem
      label="テーマプリセット"
      description="選択したテーマがアプリ全体に即時適用されます"
      standalone
    >
      <RadioGroup
        :model-value="localSettings.themePreset"
        class="grid gap-4 md:grid-cols-2"
        @update:model-value="onPresetSelect"
      >
        <label
          v-for="option in presetOptions"
          :key="option.value"
          :class="[
            'focus-within:ring-ring/50 hover:border-foreground/30 relative flex cursor-pointer flex-col rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:outline-none',
            localSettings.themePreset === option.value ? 'border-primary ring-ring/60 ring-2' : 'border-border',
          ]"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-col">
              <span class="text-sm font-medium">{{ option.label }}</span>
              <span class="text-muted-foreground text-xs">{{ option.description }}</span>
            </div>
            <RadioGroupItem :value="option.value" />
          </div>
          <div class="mt-4 flex items-center gap-2">
            <span
              class="border-border h-8 w-8 rounded-full border"
              :style="{ backgroundColor: option.preview.background }"
              aria-hidden="true"
            />
            <span
              class="border-border h-8 w-8 rounded-full border"
              :style="{ backgroundColor: option.preview.primary }"
              aria-hidden="true"
            />
          </div>
        </label>
      </RadioGroup>
    </SettingItem>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import type { AppSettings, ThemePresetId } from '~/types/settings'
import { applyTheme, getThemeBubbleColors, getThemePresetOptions } from '~/lib/theme'

interface Props {
  localSettings: AppSettings
  updateLocalSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const props = defineProps<Props>()

const presetOptions = computed(() => getThemePresetOptions())

const onPresetSelect = (value: string) => {
  const id = value as ThemePresetId
  const bubbles = getThemeBubbleColors(id)
  props.updateLocalSetting('themePreset', id)
  props.updateLocalSetting('userBubbleColor', bubbles.user)
  props.updateLocalSetting('assistantBubbleColor', bubbles.assistant)
  applyTheme(id)
}
</script>
