<template>
  <div
    ref="imageContainerRef"
    class="cursor-grab active:cursor-grabbing"
    @wheel.prevent="$emit('wheel', $event)"
    @mousedown="$emit('mouse-down', $event)"
    @mousemove="$emit('mouse-move', $event)"
    @mouseup="$emit('mouse-up')"
    @mouseleave="$emit('mouse-up')"
    @touchstart="$emit('touch-start', $event)"
    @touchmove="$emit('touch-move', $event)"
    @touchend="$emit('touch-end')"
  >
    <img
      ref="imageRef"
      :src="imageUrl"
      :alt="imageAlt"
      class="will-change-transform"
      :style="imageStyles"
      draggable="false"
      @load="$emit('image-load')"
      @error="$emit('image-error')"
    />

    <div
      v-if="isLoading"
      class="absolute inset-0 flex flex-col items-center justify-center bg-black/50"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      <p class="mt-2 text-sm text-white">画像を読み込み中...</p>
    </div>

    <div
      v-if="hasError"
      class="bg-muted absolute inset-0 flex flex-col items-center justify-center"
    >
      <Icon
        icon="material-symbols:error"
        class="text-destructive h-6 w-6"
      />
      <p class="text-muted-foreground text-center">画像の読み込みに失敗しました</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { Icon } from '@iconify/vue'

/**
 * ImageModalContent Moleculeコンポーネント
 * 画像表示部分（画像、ローディング、エラー）
 */
export interface ImageModalContentProps {
  imageUrl?: string
  imageAlt?: string
  imageStyles: Record<string, string | number>
  isLoading: boolean
  hasError: boolean
}

defineProps<ImageModalContentProps>()

defineEmits<{
  wheel: [event: WheelEvent]
  'mouse-down': [event: MouseEvent]
  'mouse-move': [event: MouseEvent]
  'mouse-up': []
  'touch-start': [event: TouchEvent]
  'touch-move': [event: TouchEvent]
  'touch-end': []
  'image-load': []
  'image-error': []
}>()

const imageContainerRef: Ref<HTMLElement | null> = ref(null)
const imageRef: Ref<HTMLImageElement | null> = ref(null)

defineExpose({
  imageContainerRef,
  imageRef,
})
</script>
