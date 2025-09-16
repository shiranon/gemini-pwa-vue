<template>
  <div class="border-border bg-card text-card-foreground border-b px-6 py-4">
    <div class="flex items-center justify-between">
      <h2 class="text-foreground text-lg font-semibold">
        {{ title }}
      </h2>
      <div class="flex items-center space-x-2">
        <div class="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            :disabled="zoomLevel <= minZoom"
            @click="$emit('zoom-out')"
          >
            <Icon
              icon="material-symbols:zoom-out"
              class="h-4 w-4"
            />
          </Button>
          <span class="text-muted-foreground min-w-[3rem] text-center text-sm font-medium"> {{ Math.round(zoomLevel * 100) }}% </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="zoomLevel >= maxZoom"
            @click="$emit('zoom-in')"
          >
            <Icon
              icon="material-symbols:zoom-in"
              class="h-4 w-4"
            />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          @click="$emit('close')"
        >
          <Icon
            icon="material-symbols:close"
            class="h-4 w-4"
          />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Icon } from '@iconify/vue'

/**
 * ImageModalHeader Moleculeコンポーネント
 * モーダルのヘッダー部分（タイトル、ズーム、閉じる）
 */
export interface ImageModalHeaderProps {
  title: string
  zoomLevel: number
  minZoom: number
  maxZoom: number
}

defineProps<ImageModalHeaderProps>()

defineEmits<{
  'zoom-in': []
  'zoom-out': []
  close: []
}>()
</script>
