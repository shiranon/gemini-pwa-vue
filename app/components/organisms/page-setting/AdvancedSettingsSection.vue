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
        @update:model-value="updateSetting('streamingSpeed', $event?.[0] ?? 50)"
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
        @update:model-value="updateSetting('maxRetries', typeof $event === 'number' ? $event : Number($event))"
      />
    </SettingItem>

    <SettingToggle
      :model-value="localSettings.useFixedRetryDelay"
      label="固定リトライ間隔"
      description="指数バックオフではなく固定間隔でリトライ"
      :disabled="!localSettings.enableAutoRetry"
      @update:model-value="(value: boolean) => updateSetting('useFixedRetryDelay', value)"
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
        @update:model-value="updateSetting('fixedRetryDelaySeconds', $event?.[0] ?? 5)"
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
        @update:model-value="updateSetting('maxBackoffDelaySeconds', $event?.[0] ?? 60)"
      />
    </SettingItem>

    <!-- Claude Extended Thinking設定 -->
    <template v-if="localProfileSettings?.apiProvider === 'claude'">
      <SettingToggle
        :model-value="localProfileSettings?.enableExtendedThinking ?? false"
        label="Extended Thinking有効化"
        description="Claudeの拡張思考モード（より深い推論、コスト増）"
        @update:model-value="(value: boolean) => updateProfileSetting('enableExtendedThinking', value)"
      />

      <SettingItem
        v-if="localProfileSettings?.enableExtendedThinking"
        name="thinkingBudget"
        label="思考トークン数"
        description="思考に使用する最大トークン数（1024-10000推奨）"
        :value="`${localProfileSettings?.thinkingBudget ?? 5000}トークン`"
        show-value
      >
        <Slider
          :model-value="[localProfileSettings?.thinkingBudget ?? 5000]"
          :min="1024"
          :max="10000"
          :step="256"
          @update:model-value="updateProfileSetting('thinkingBudget', $event?.[0] ?? 5000)"
        />
      </SettingItem>

      <!-- Claude Cache Control設定 -->
      <SettingToggle
        :model-value="localSettings.enableCacheControl"
        label="Cache Control有効化"
        description="プロンプトキャッシュでコスト削減（繰り返し使用時に有効）"
        @update:model-value="(value: boolean) => updateSetting('enableCacheControl', value)"
      />

      <SettingToggle
        v-if="localSettings.enableCacheControl"
        :model-value="localSettings.cacheSystemPrompt"
        label="システムプロンプトをキャッシュ"
        description="システムプロンプトをキャッシュしてコスト削減"
        @update:model-value="(value: boolean) => updateSetting('cacheSystemPrompt', value)"
      />

      <SettingToggle
        v-if="localSettings.enableCacheControl"
        :model-value="localSettings.cacheTools"
        label="ツール定義をキャッシュ"
        description="Function Callingツール定義をキャッシュ"
        @update:model-value="(value: boolean) => updateSetting('cacheTools', value)"
      />

      <SettingToggle
        v-if="localSettings.enableCacheControl"
        :model-value="localSettings.enablePromptCaching"
        label="Prompt Caching有効化"
        description="繰り返しプロンプトの最適化（実験的機能）"
        @update:model-value="(value: boolean) => updateSetting('enablePromptCaching', value)"
      />
    </template>
  </SettingSection>
</template>

<script setup lang="ts">
import type { AppSettings, SettingsProfileData } from '~/types/settings'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { Input } from '~/components/ui/input'
import { Slider } from '~/components/ui/slider'

export interface AdvancedSettingsSectionProps {
  localSettings: AppSettings
  localProfileSettings?: SettingsProfileData
}

defineProps<AdvancedSettingsSectionProps>()

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
