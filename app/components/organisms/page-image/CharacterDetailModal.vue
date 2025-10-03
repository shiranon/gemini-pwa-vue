<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-background border-border w-full max-w-4xl rounded-lg border shadow-lg">
      <!-- ヘッダー -->
      <div class="border-border border-b p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">{{ character }}の画像一覧</h2>
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

      <!-- 画像一覧 -->
      <div class="p-6">
        <div
          v-if="images.length === 0"
          class="py-8 text-center"
        >
          <Icon
            icon="material-symbols:image"
            class="text-muted-foreground mx-auto h-12 w-12"
          />
          <p class="text-muted-foreground mt-2">画像がありません</p>
        </div>

        <div
          v-else
          class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:gap-3"
        >
          <div
            v-for="image in images"
            :key="image.id"
            class="border-border bg-card overflow-hidden rounded-lg border"
          >
            <img
              :src="`data:${image.mimeType};base64,${image.base64Data}`"
              :alt="`${image.character}_${image.cloth}_${image.expression}`"
              class="h-[150px] w-full object-cover md:h-[120px]"
            />
            <div class="flex items-start justify-between gap-2 p-3 md:flex-col md:items-stretch md:p-2">
              <div class="min-w-0 flex-1">
                <div class="mb-1 font-medium break-words">{{ image.cloth }} - {{ image.expression }}</div>
                <div class="text-muted-foreground text-xs">{{ formatFileSize(image.size) }} • {{ formatDate(image.createdAt) }}</div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                :disabled="isDeleting"
                @click="deleteImage(image.id)"
              >
                <Icon
                  icon="material-symbols:delete"
                  class="h-4 w-4"
                />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { CharacterImageAssetRecord } from '~/types/database'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { formatFileSize, formatDate } from '~/lib/format'

interface Props {
  character: string
  images: CharacterImageAssetRecord[]
}

const _props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'image-deleted': []
}>()

const { deleteImage: deleteImageAsset } = useCharacterImages()
const isDeleting = ref(false)

const deleteImage = async (imageId: string) => {
  if (!confirm('この画像を削除しますか？')) return

  try {
    isDeleting.value = true
    const success = await deleteImageAsset(imageId)

    if (success) {
      emit('image-deleted')
    }
  } catch (err) {
    console.error('画像の削除に失敗:', err)
  } finally {
    isDeleting.value = false
  }
}
</script>
