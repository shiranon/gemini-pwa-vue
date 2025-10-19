<template>
  <div
    v-if="attachments && attachments.length > 0"
    class="mt-3 space-y-2"
  >
    <div class="text-muted-foreground text-sm font-medium">添付ファイル ({{ attachments.length }})</div>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div
        v-for="file in attachments"
        :key="file.id"
        class="bg-muted/60 border-border flex items-center gap-3 rounded-lg border p-3"
      >
        <!-- 画像の場合はプレビュー、それ以外はアイコン -->
        <img
          v-if="isImageFile(file.type) && getImagePreviewUrl(file)"
          :src="getImagePreviewUrl(file)"
          :alt="file.name"
          class="h-auto w-20 flex-shrink-0 rounded object-cover"
        />
        <Icon
          v-else
          :icon="getAttachmentIcon(file.type)"
          class="text-muted-foreground h-6 w-6 flex-shrink-0"
        />

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ file.name }}</p>
          <p class="text-muted-foreground text-xs">{{ formatFileSize(file.size) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { AttachedFile } from '~/types/chat'
import { formatFileSize } from '~/lib/format'

interface Props {
  attachments?: AttachedFile[]
}

defineProps<Props>()

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'mdi:file-image-outline'
  if (mimeType === 'application/pdf') return 'mdi:file-pdf-box'
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml' || mimeType === 'text/xml') return 'mdi:file-document-outline'
  return 'mdi:file-outline'
}

const isImageFile = (mimeType: string) => {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)
}

const getImagePreviewUrl = (file: AttachedFile): string | undefined => {
  if (!isImageFile(file.type)) return undefined

  // base64データからdata URLを作成
  if (file.data) {
    return `data:${file.type};base64,${file.data}`
  }

  return undefined
}
</script>
