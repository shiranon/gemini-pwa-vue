<template>
  <SettingSection
    title="背景画像設定"
    description="チャット画面の背景画像や可読性調整を設定"
    single-column
  >
    <SettingItem
      label="背景画像"
      standalone
    >
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <Input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="w-full"
            @change="onFileChange"
          />
          <Button
            variant="outline"
            :disabled="!props.localSettings.backgroundImageDataUrl"
            @click="removeImage"
          >
            画像を削除
          </Button>
        </div>

        <p class="text-muted-foreground text-xs">最大サイズ: {{ maxSizeMB }}MB（端末内処理・保存）</p>

        <div
          v-if="previewUrl"
          class="border-border bg-muted overflow-hidden rounded-lg border"
        >
          <div class="grid grid-cols-1 gap-0 md:grid-cols-2">
            <div class="bg-muted/80 relative h-40 w-full">
              <img
                :src="previewUrl"
                alt="背景プレビュー"
                class="h-full w-full object-cover"
              />
              <div
                class="absolute inset-0"
                :style="{ backgroundColor: overlayPreviewColor }"
              />
              <!-- メッセージバブルの簡易プレビュー -->
              <div class="pointer-events-none absolute inset-0">
                <div
                  class="absolute bottom-3 left-3 max-w-[70%] border text-xs shadow-sm"
                  :style="{
                    backgroundColor: bubbleAssistantBg,
                    borderColor: 'color-mix(in srgb, var(--foreground) 15%, transparent)',
                    fontFamily: 'var(--message-font-family)',
                    borderRadius: bubbleRadius,
                    padding: bubblePadding,
                    color: 'var(--foreground)',
                  }"
                >
                  これはアシスタントのメッセージプレビューです。
                </div>
                <div
                  class="absolute right-3 bottom-16 max-w-[70%] border text-xs shadow-sm"
                  :style="{
                    backgroundColor: bubbleUserBg,
                    borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                    fontFamily: 'var(--message-font-family)',
                    borderRadius: bubbleRadius,
                    padding: bubblePadding,
                    color: 'var(--foreground)',
                  }"
                >
                  これはユーザーのメッセージプレビューです。
                </div>
              </div>
            </div>
            <div class="text-muted-foreground p-3 text-sm">
              <p class="mb-1">オーバーレイ: {{ toPercent(props.localSettings.overlayOpacity) }}%</p>
              <p>メッセージ不透明度: {{ toPercent(props.localSettings.messageOpacity) }}%</p>
            </div>
          </div>
        </div>
      </div>
    </SettingItem>

    <SettingItem
      label="オーバーレイの濃さ"
      standalone
    >
      <div class="flex items-center gap-4">
        <div class="text-muted-foreground min-w-[120px] text-sm">{{ toPercent(props.localSettings.overlayOpacity) }}%</div>
        <Slider
          :model-value="[props.localSettings.overlayOpacity]"
          :min="0"
          :max="0.8"
          :step="0.05"
          class="flex-1"
          @update:model-value="(v?: number[]) => updateOverlayOpacity(v?.[0] ?? props.localSettings.overlayOpacity)"
        />
      </div>
    </SettingItem>

    <SettingItem
      label="オーバーレイの色"
      description="オーバーレイの基準色（透過は濃さで調整）"
      standalone
    >
      <div class="flex items-center gap-3">
        <input
          :value="props.localSettings.overlayColor"
          type="color"
          class="h-9 w-12 cursor-pointer rounded border"
          @input="onColorInput($event as InputEvent)"
        />
        <Input
          :model-value="props.localSettings.overlayColor"
          class="w-32"
          @update:model-value="onColorText"
        />
        <span class="text-muted-foreground text-xs">例: #000000, #334155</span>
      </div>
    </SettingItem>

    <SettingItem
      label="メッセージ不透明度"
      standalone
    >
      <div class="flex items-center gap-4">
        <div class="text-muted-foreground min-w-[120px] text-sm">{{ toPercent(props.localSettings.messageOpacity) }}%</div>
        <Slider
          :model-value="[props.localSettings.messageOpacity]"
          :min="0.5"
          :max="1"
          :step="0.05"
          class="flex-1"
          @update:model-value="(v?: number[]) => updateMessageOpacity(v?.[0] ?? props.localSettings.messageOpacity)"
        />
      </div>
    </SettingItem>
  </SettingSection>
</template>

<script setup lang="ts">
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Slider } from '~/components/ui/slider'
import type { AppSettings } from '~/types/settings'
import { clamp, toPercent } from '~/utils/calc'
import { normalizeHex, hexToRgba } from '~/utils/color'

interface Props {
  localSettings: AppSettings
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update-setting': [key: keyof AppSettings, value: AppSettings[keyof AppSettings]]
}>()

const fileInput = ref<HTMLInputElement>()
const previewUrl = ref<string | null>(null)

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const maxSizeMB = computed(() => Math.round(MAX_IMAGE_SIZE / 1024 / 1024))

watch(
  () => props.localSettings.backgroundImageDataUrl,
  (url) => {
    previewUrl.value = url || null
  },
  { immediate: true }
)

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > MAX_IMAGE_SIZE) {
    alert(`画像サイズが大きすぎます。${maxSizeMB.value}MB以下の画像を選択してください。`)
    target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result
    if (typeof result === 'string') {
      emit('update-setting', 'backgroundImageDataUrl', result)
    }
  }
  reader.readAsDataURL(file)
}

const removeImage = () => {
  emit('update-setting', 'backgroundImageDataUrl', null)
  if (fileInput.value) fileInput.value.value = ''
}

const updateOverlayOpacity = (value: number) => {
  const clamped = clamp(value, 0, 0.8)
  emit('update-setting', 'overlayOpacity', clamped as AppSettings['overlayOpacity'])
}

const updateMessageOpacity = (value: number) => {
  const clamped = clamp(value, 0.5, 1)
  emit('update-setting', 'messageOpacity', clamped as AppSettings['messageOpacity'])
}

const onColorInput = (e: InputEvent) => {
  const input = e.target as HTMLInputElement
  const normalized = normalizeHex(input.value, '#000000')
  emit('update-setting', 'overlayColor', normalized as AppSettings['overlayColor'])
}

const onColorText = (value: string | number) => {
  const normalized = normalizeHex(String(value || ''), '#000000')
  emit('update-setting', 'overlayColor', normalized as AppSettings['overlayColor'])
}

const overlayPreviewColor = computed(() => {
  const hex = props.localSettings.overlayColor || '#000000'
  return hexToRgba(hex, props.localSettings.overlayOpacity)
})

const bubbleAssistantBg = computed(() => hexToRgba(props.localSettings.assistantBubbleColor || '#ffffff', props.localSettings.messageOpacity))
const bubbleUserBg = computed(() => hexToRgba(props.localSettings.userBubbleColor || '#eff6ff', props.localSettings.messageOpacity))
const bubbleRadius = computed(() => `${props.localSettings.messageBubbleRadius}px`)
const bubblePadding = computed(() => `${props.localSettings.messageBubblePaddingY}px ${props.localSettings.messageBubblePaddingX}px`)
</script>
