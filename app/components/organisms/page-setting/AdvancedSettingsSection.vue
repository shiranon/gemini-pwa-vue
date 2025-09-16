<!-- eslint-disable vue/no-mutating-props -->
<template>
  <SettingSection
    title="高度な設定"
    description="詳細な動作調整"
  >
    <SettingItem
      name="streamingSpeed"
      label="ストリーミング速度"
      description="文字表示の間隔（小さいほど速い）"
      :value="`${localSettings.streamingSpeed}ms`"
      show-value
    >
      <Slider
        :model-value="[localSettings.streamingSpeed]"
        :min="10"
        :max="200"
        :step="10"
        @update:model-value="localSettings.streamingSpeed = $event?.[0] ?? 50"
      />
    </SettingItem>

    <SettingItem
      name="maxRetries"
      label="最大リトライ回数"
      :disabled="!localSettings.enableAutoRetry"
    >
      <Input
        :model-value="localSettings.maxRetries"
        type="number"
        :min="0"
        :max="10"
        :disabled="!localSettings.enableAutoRetry"
        @update:model-value="localSettings.maxRetries = typeof $event === 'number' ? $event : Number($event)"
      />
    </SettingItem>

    <SettingToggle
      v-model="localSettings.enableSwipeNavigation"
      label="スワイプナビゲーション"
      description="スワイプジェスチャーでのナビゲーションを有効化"
      disabled
    />

    <SettingToggle
      v-model="localSettings.useFixedRetryDelay"
      label="固定リトライ間隔"
      description="指数バックオフではなく固定間隔でリトライ"
      :disabled="!localSettings.enableAutoRetry"
    />

    <SettingItem
      name="fixedRetryDelaySeconds"
      label="固定リトライ間隔（秒）"
      description="固定間隔リトライの待機時間"
      :disabled="!localSettings.enableAutoRetry || !localSettings.useFixedRetryDelay"
      :value="`${localSettings.fixedRetryDelaySeconds}秒`"
      show-value
    >
      <Slider
        :model-value="[localSettings.fixedRetryDelaySeconds]"
        :min="1"
        :max="60"
        :step="1"
        :disabled="!localSettings.enableAutoRetry || !localSettings.useFixedRetryDelay"
        @update:model-value="localSettings.fixedRetryDelaySeconds = $event?.[0] ?? 5"
      />
    </SettingItem>

    <SettingItem
      name="maxBackoffDelaySeconds"
      label="最大バックオフ間隔（秒）"
      description="指数バックオフの最大待機時間"
      :disabled="!localSettings.enableAutoRetry || localSettings.useFixedRetryDelay"
      :value="`${localSettings.maxBackoffDelaySeconds}秒`"
      show-value
    >
      <Slider
        :model-value="[localSettings.maxBackoffDelaySeconds]"
        :min="10"
        :max="300"
        :step="10"
        :disabled="!localSettings.enableAutoRetry || localSettings.useFixedRetryDelay"
        @update:model-value="localSettings.maxBackoffDelaySeconds = $event?.[0] ?? 60"
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
export interface AdvancedSettingsSectionProps {
  localSettings: AppSettings
}

defineProps<AdvancedSettingsSectionProps>()
</script>
