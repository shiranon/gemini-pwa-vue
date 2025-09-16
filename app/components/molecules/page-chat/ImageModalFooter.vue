<template>
  <div class="border-border bg-card text-card-foreground border-t px-6 py-4">
    <div class="flex items-center justify-between">
      <div
        v-if="imageInfo"
        class="flex-1"
      >
        <span class="text-muted-foreground text-sm">
          {{ imageInfo.width }} × {{ imageInfo.height }}
          <span v-if="imageInfo.size">・{{ formatFileSize(imageInfo.size) }}</span>
        </span>
      </div>

      <div class="flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          :aria-label="'表示をリセット'"
          @click="$emit('reset')"
        >
          <Icon
            icon="material-symbols:restart-alt"
            class="mr-2 h-4 w-4"
          />
          リセット
        </Button>

        <Button
          v-if="downloadable"
          variant="default"
          size="sm"
          :aria-label="'画像をダウンロード'"
          @click="$emit('download')"
        >
          <Icon
            icon="material-symbols:download"
            class="mr-2 h-4 w-4"
          />
          ダウンロード
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { formatFileSize } from '~/lib/format'

/**
 * ImageModalFooter Moleculeコンポーネント
 * モーダルのフッター部分（画像情報、アクション）
 */
export interface ImageInfo {
  width: number
  height: number
  size?: number
}

export interface ImageModalFooterProps {
  imageInfo?: ImageInfo | null
  downloadable?: boolean
}

withDefaults(defineProps<ImageModalFooterProps>(), {
  imageInfo: null,
  downloadable: true,
})

defineEmits<{
  reset: []
  download: []
}>()
</script>
