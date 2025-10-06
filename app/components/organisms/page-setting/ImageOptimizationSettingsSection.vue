<template>
  <SettingSection
    title="画像最適化設定"
    description="画像の自動圧縮とWebP変換でストレージ効率を向上"
    :default-open="false"
  >
    <!-- 画像最適化の有効/無効 -->
    <SettingToggle
      :model-value="props.localSettings.enableImageOptimization"
      label="画像最適化"
      description="アップロード時に画像を自動で最適化します（リサイズ・圧縮・WebP変換）"
      @update:model-value="(value: boolean) => props.updateLocalSetting('enableImageOptimization', value)"
    />

    <!-- 最適化設定（有効時のみ表示） -->
    <template v-if="props.localSettings.enableImageOptimization">
      <!-- 最大解像度設定 -->
      <SettingItem
        title="最大解像度"
        description="画像の最大サイズを制限します（1920x1080推奨）"
        standalone
      >
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">幅 (px)</label>
            <Input
              :model-value="props.localSettings.maxImageWidth"
              type="number"
              min="100"
              max="4096"
              step="10"
              @update:model-value="(value: string | number) => updateMaxImageWidth(Number(value))"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">高さ (px)</label>
            <Input
              :model-value="props.localSettings.maxImageHeight"
              type="number"
              min="100"
              max="4096"
              step="10"
              @update:model-value="(value: string | number) => updateMaxImageHeight(Number(value))"
            />
          </div>
        </div>
      </SettingItem>

      <!-- 圧縮品質設定 -->
      <SettingItem
        title="圧縮品質"
        description="画像の圧縮品質を設定します（高いほど画質が良く、ファイルサイズが大きくなります）"
        standalone
      >
        <div class="flex items-center gap-4">
          <div class="text-muted-foreground min-w-[120px] text-sm">{{ Math.round(props.localSettings.compressionQuality * 100) }}%</div>
          <Slider
            :model-value="[props.localSettings.compressionQuality]"
            :min="0.1"
            :max="1"
            :step="0.05"
            class="flex-1"
            @update:model-value="(v?: number[]) => updateCompressionQuality(v?.[0] ?? props.localSettings.compressionQuality)"
          />
        </div>
      </SettingItem>

      <!-- WebP変換設定 -->
      <SettingToggle
        :model-value="props.localSettings.enableWebPConversion"
        label="WebP変換"
        description="画像をWebP形式に自動変換します（ファイルサイズを大幅に削減）"
        @update:model-value="(value: boolean) => props.updateLocalSetting('enableWebPConversion', value)"
      />

      <!-- WebP品質設定（WebP変換有効時のみ表示） -->
      <SettingItem
        v-if="props.localSettings.enableWebPConversion"
        title="WebP品質"
        description="WebP変換時の品質を設定します"
        standalone
      >
        <div class="flex items-center gap-4">
          <div class="text-muted-foreground min-w-[120px] text-sm">{{ Math.round(props.localSettings.webpQuality * 100) }}%</div>
          <Slider
            :model-value="[props.localSettings.webpQuality]"
            :min="0.1"
            :max="1"
            :step="0.05"
            class="flex-1"
            @update:model-value="(v?: number[]) => updateWebpQuality(v?.[0] ?? props.localSettings.webpQuality)"
          />
        </div>
      </SettingItem>

      <!-- 最適化効果の説明 -->
      <div class="border-border bg-muted/50 rounded-lg border p-4">
        <div class="flex items-start gap-3">
          <Icon
            icon="material-symbols:info"
            class="mt-0.5 h-5 w-5 text-blue-500"
          />
          <div class="space-y-2">
            <h4 class="text-sm font-medium">最適化効果</h4>
            <ul class="text-muted-foreground space-y-1 text-sm">
              <li>• Base64エンコーディングによる33%のサイズ増加を考慮</li>
              <li>• 自動リサイズでストレージ使用量を削減</li>
              <li>• WebP変換でさらに20-50%のサイズ削減</li>
              <li>• IndexedDBストレージクォータの効率的な利用</li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </SettingSection>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { Input } from '~/components/ui/input'
import { Slider } from '~/components/ui/slider'
import type { AppSettings } from '~/types/settings'
import { clamp } from '~/utils/calc'

interface Props {
  localSettings: AppSettings
  updateLocalSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const props = defineProps<Props>()

const updateMaxImageWidth = (value: number) => {
  const clamped = clamp(value, 100, 4096)
  props.updateLocalSetting('maxImageWidth', clamped)
}

const updateMaxImageHeight = (value: number) => {
  const clamped = clamp(value, 100, 4096)
  props.updateLocalSetting('maxImageHeight', clamped)
}

const updateCompressionQuality = (value: number) => {
  const clamped = clamp(value, 0.1, 1)
  props.updateLocalSetting('compressionQuality', clamped)
}

const updateWebpQuality = (value: number) => {
  const clamped = clamp(value, 0.1, 1)
  props.updateLocalSetting('webpQuality', clamped)
}
</script>
