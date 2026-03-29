<template>
  <SettingSection
    title="メッセージ表示設定"
    description="フォントとメッセージバブル全体の見た目をまとめて調整"
    single-column
    :default-open="false"
  >
    <div class="space-y-6">
      <SettingItem
        label="フォントソース"
        standalone
        collapsible
        :default-open="false"
      >
        <div class="space-y-4">
          <div class="flex flex-wrap gap-3">
            <label class="flex items-center gap-2">
              <input
                v-model="fontMode"
                type="radio"
                name="fontMode"
                value="preset"
                class="text-primary"
              />
              <span class="text-sm">プリセット</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                v-model="fontMode"
                type="radio"
                name="fontMode"
                value="system"
                class="text-primary"
              />
              <span class="text-sm">システムフォント</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                v-model="fontMode"
                type="radio"
                name="fontMode"
                value="upload"
                class="text-primary"
              />
              <span class="text-sm">アップロード</span>
            </label>
          </div>

          <div v-if="fontMode === 'preset'">
            <Select
              :model-value="selectedPreset"
              @update:model-value="(value: unknown) => typeof value === 'string' && onPresetChange(value)"
            >
              <SelectTrigger>
                <SelectValue placeholder="フォントプリセットを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="preset in fontPresets"
                  :key="preset.value"
                  :value="preset.value"
                >
                  {{ preset.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-else-if="fontMode === 'system'"
            class="space-y-2"
          >
            <Input
              v-model="systemFontName"
              placeholder='例: "Yu Gothic", "Meiryo"'
              class="w-full"
              @change="onSystemFontChange"
            />
            <p class="text-muted-foreground text-xs">端末にインストールされている場合のみ反映。存在しない場合は自動フォールバック。</p>
          </div>

          <div
            v-else
            class="space-y-2"
          >
            <Input
              ref="fileInput"
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              class="w-full"
              @change="onFileUpload"
            />
            <p class="text-muted-foreground text-xs">
              対応形式: .woff2, .woff, .ttf, .otf<br />
              著作権/ライセンスにご注意ください。アップロードは端末内処理で完結。
            </p>
          </div>
        </div>
      </SettingItem>

      <SettingItem
        label="フォントサイズ (px)"
        standalone
        collapsible
        :default-open="false"
      >
        <div class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">本文</span>
            <Slider
              :model-value="[messageFontSize]"
              :min="12"
              :max="28"
              :step="1"
              class="flex-1"
              @update:model-value="(value?: number[]) => updateMessageFontSize(value?.[0] ?? messageFontSize)"
            />
            <Input
              :model-value="messageFontSize"
              type="number"
              class="w-24"
              :min="12"
              :max="28"
              @update:model-value="(value: string | number | null) => updateMessageFontSize(typeof value === 'number' ? value : Number(value))"
            />
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">Function Calling</span>
            <Slider
              :model-value="[functionCallFontSize]"
              :min="10"
              :max="24"
              :step="1"
              class="flex-1"
              @update:model-value="(value?: number[]) => updateFunctionCallFontSize(value?.[0] ?? functionCallFontSize)"
            />
            <Input
              :model-value="functionCallFontSize"
              type="number"
              class="w-24"
              :min="10"
              :max="24"
              @update:model-value="(value: string | number | null) => updateFunctionCallFontSize(typeof value === 'number' ? value : Number(value))"
            />
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">思考プロセス</span>
            <Slider
              :model-value="[thoughtFontSize]"
              :min="10"
              :max="22"
              :step="1"
              class="flex-1"
              @update:model-value="(value?: number[]) => updateThoughtFontSize(value?.[0] ?? thoughtFontSize)"
            />
            <Input
              :model-value="thoughtFontSize"
              type="number"
              class="w-24"
              :min="10"
              :max="22"
              @update:model-value="(value: string | number | null) => updateThoughtFontSize(typeof value === 'number' ? value : Number(value))"
            />
          </div>
        </div>
      </SettingItem>

      <SettingItem
        label="バブル形状"
        standalone
        collapsible
        :default-open="false"
      >
        <div class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">角丸</span>
            <Slider
              :model-value="[messageBubbleRadius]"
              :min="0"
              :max="32"
              :step="1"
              class="flex-1"
              @update:model-value="(value?: number[]) => updateBubbleRadius(value?.[0] ?? messageBubbleRadius)"
            />
            <Input
              :model-value="messageBubbleRadius"
              type="number"
              class="w-24"
              :min="0"
              :max="32"
              @update:model-value="(value: string | number | null) => updateBubbleRadius(typeof value === 'number' ? value : Number(value))"
            />
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">左右余白</span>
            <Slider
              :model-value="[messageBubblePaddingX]"
              :min="8"
              :max="40"
              :step="1"
              class="flex-1"
              @update:model-value="(value?: number[]) => updateBubblePaddingX(value?.[0] ?? messageBubblePaddingX)"
            />
            <Input
              :model-value="messageBubblePaddingX"
              type="number"
              class="w-24"
              :min="8"
              :max="40"
              @update:model-value="(value: string | number | null) => updateBubblePaddingX(typeof value === 'number' ? value : Number(value))"
            />
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">上下余白</span>
            <Slider
              :model-value="[messageBubblePaddingY]"
              :min="8"
              :max="32"
              :step="1"
              class="flex-1"
              @update:model-value="(value?: number[]) => updateBubblePaddingY(value?.[0] ?? messageBubblePaddingY)"
            />
            <Input
              :model-value="messageBubblePaddingY"
              type="number"
              class="w-24"
              :min="8"
              :max="32"
              @update:model-value="(value: string | number | null) => updateBubblePaddingY(typeof value === 'number' ? value : Number(value))"
            />
          </div>
        </div>
      </SettingItem>

      <SettingItem
        label="画像設定"
        standalone
        collapsible
        :default-open="false"
      >
        <div class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">横幅 (%)</span>
            <Slider
              :model-value="[messageImageWidthPercent ?? 100]"
              :min="10"
              :max="100"
              :step="1"
              class="flex-1"
              @update:model-value="(value?: number[]) => updateMessageImageWidthPercent(value?.[0] ?? null)"
            />
            <Input
              :model-value="messageImageWidthPercent ?? ''"
              type="number"
              class="w-24"
              :min="10"
              :max="100"
              placeholder="100"
              @update:model-value="
                (value: string | number | null) => {
                  if (value === null) {
                    updateMessageImageWidthPercent(null)
                    return
                  }
                  if (typeof value === 'string') {
                    if (value.trim() === '') {
                      updateMessageImageWidthPercent(null)
                      return
                    }
                    updateMessageImageWidthPercent(Number(value))
                    return
                  }
                  updateMessageImageWidthPercent(value)
                }
              "
            />
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span class="text-muted-foreground w-32 text-sm">配置</span>
            <RadioGroup
              :model-value="messageImageJustify"
              class="grid gap-2 sm:flex sm:items-center sm:gap-3"
              @update:model-value="updateMessageImageJustify"
            >
              <label
                v-for="option in imageJustifyOptions"
                :key="option.value"
                :class="[
                  'border-border text-foreground hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-ring/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-[color,box-shadow,border-color] focus-visible:ring-[3px] focus-visible:outline-none',
                  messageImageJustify === option.value ? 'border-primary bg-primary/5 text-primary' : '',
                ]"
              >
                <RadioGroupItem :value="option.value" />
                <span>{{ option.label }}</span>
              </label>
            </RadioGroup>
          </div>
          <p class="text-muted-foreground text-xs">幅はメッセージ幅に対する割合です。配置は左寄せ・中央・右寄せから選べます。</p>
        </div>
      </SettingItem>

      <SettingItem
        label="プレビュー"
        standalone
      >
        <MessageBubblePreview :appearance="previewAppearance" />
      </SettingItem>
    </div>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import MessageBubblePreview from '~/components/molecules/page-chat/MessageBubblePreview.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Input } from '~/components/ui/input'
import { Slider } from '~/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import type { AppSettings } from '~/types/settings'
import { clamp } from '~/lib/calc'
import { fontSettings } from '~/lib/fontSettings'

interface Props {
  localSettings: AppSettings
  updateLocalSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const props = defineProps<Props>()
const { fontPresets, applyPreset, applySystemFont, applyUploadedFont } = fontSettings()

const imageJustifyOptions = [
  { value: 'start', label: '左寄せ' },
  { value: 'center', label: '中央' },
  { value: 'end', label: '右寄せ' },
] as const

const fontMode = computed({
  get: () => props.localSettings.fontMode,
  set: (value: 'preset' | 'system' | 'upload') => {
    props.updateLocalSetting('fontMode', value)
  },
})

const systemFontName = computed({
  get: () => props.localSettings.systemFontName,
  set: (value: string) => {
    props.updateLocalSetting('systemFontName', value)
  },
})

const selectedPreset = computed({
  get: () => props.localSettings.selectedPreset,
  set: (value: string) => {
    props.updateLocalSetting('selectedPreset', value)
  },
})

const fileInput = ref<HTMLInputElement>()

const messageFontSize = computed(() => props.localSettings.messageFontSize)
const functionCallFontSize = computed(() => props.localSettings.functionCallFontSize)
const thoughtFontSize = computed(() => props.localSettings.thoughtFontSize)
const messageBubbleRadius = computed(() => props.localSettings.messageBubbleRadius)
const messageBubblePaddingX = computed(() => props.localSettings.messageBubblePaddingX)
const messageBubblePaddingY = computed(() => props.localSettings.messageBubblePaddingY)
const messageImageWidthPercent = computed(() => props.localSettings.messageImageWidthPercent)
const messageImageJustify = computed(() => props.localSettings.messageImageJustify)

const updateMessageFontSize = (value: number) => {
  const clamped = clamp(Number(value) || props.localSettings.messageFontSize, 12, 28)
  props.updateLocalSetting('messageFontSize', clamped as AppSettings['messageFontSize'])
}

const updateFunctionCallFontSize = (value: number) => {
  const clamped = clamp(Number(value) || props.localSettings.functionCallFontSize, 10, 24)
  props.updateLocalSetting('functionCallFontSize', clamped as AppSettings['functionCallFontSize'])
}

const updateThoughtFontSize = (value: number) => {
  const clamped = clamp(Number(value) || props.localSettings.thoughtFontSize, 10, 22)
  props.updateLocalSetting('thoughtFontSize', clamped as AppSettings['thoughtFontSize'])
}

const updateBubbleRadius = (value: number) => {
  const clamped = clamp(Number(value) || props.localSettings.messageBubbleRadius, 0, 32)
  props.updateLocalSetting('messageBubbleRadius', clamped as AppSettings['messageBubbleRadius'])
}

const updateBubblePaddingX = (value: number) => {
  const clamped = clamp(Number(value) || props.localSettings.messageBubblePaddingX, 8, 40)
  props.updateLocalSetting('messageBubblePaddingX', clamped as AppSettings['messageBubblePaddingX'])
}

const updateBubblePaddingY = (value: number) => {
  const clamped = clamp(Number(value) || props.localSettings.messageBubblePaddingY, 8, 32)
  props.updateLocalSetting('messageBubblePaddingY', clamped as AppSettings['messageBubblePaddingY'])
}

const updateMessageImageWidthPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    props.updateLocalSetting('messageImageWidthPercent', null)
    return
  }

  const clamped = clamp(Number(value), 10, 100)
  props.updateLocalSetting('messageImageWidthPercent', clamped as AppSettings['messageImageWidthPercent'])
}

const updateMessageImageJustify = (value: unknown) => {
  if (value === 'start' || value === 'center' || value === 'end') {
    props.updateLocalSetting('messageImageJustify', value as AppSettings['messageImageJustify'])
  }
}

const onPresetChange = async (value: string) => {
  const fontStack = await applyPreset(value)
  if (fontStack) {
    props.updateLocalSetting('selectedPreset', value)
    props.updateLocalSetting('fontFamily', fontStack)
  }
}

const onSystemFontChange = () => {
  if (systemFontName.value.trim()) {
    const fontStack = applySystemFont(systemFontName.value)
    if (fontStack) {
      props.updateLocalSetting('systemFontName', systemFontName.value)
      props.updateLocalSetting('fontFamily', fontStack)
    }
  }
}

const onFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const MAX_FONT_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FONT_SIZE) {
      alert('フォントファイルが大きすぎます。10MB以下のファイルを選択してください。')
      target.value = ''
      return
    }

    const result = await applyUploadedFont(file)
    props.updateLocalSetting('fontFamily', result.fontStack)
    props.updateLocalSetting('uploadedFont', result.fontData)
  } catch (error) {
    alert(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました')
  }
}

const previewAppearance = computed(() => ({
  fontFamily: props.localSettings.fontFamily,
  messageFontSize: props.localSettings.messageFontSize,
  functionCallFontSize: props.localSettings.functionCallFontSize,
  thoughtFontSize: props.localSettings.thoughtFontSize,
  bubbleRadius: props.localSettings.messageBubbleRadius,
  bubblePaddingX: props.localSettings.messageBubblePaddingX,
  bubblePaddingY: props.localSettings.messageBubblePaddingY,
  imageWidthPercent: props.localSettings.messageImageWidthPercent,
  imageJustify: props.localSettings.messageImageJustify,
  userBubbleColor: props.localSettings.userBubbleColor,
  assistantBubbleColor: props.localSettings.assistantBubbleColor,
  opacity: props.localSettings.messageOpacity,
}))
</script>
