<template>
  <div
    class="border-border bg-card hover:bg-muted/50 group relative cursor-pointer rounded-xl border p-2 transition-all duration-200 hover:shadow-md"
    @click="selectCategory"
  >
    <div class="flex flex-col items-center justify-center text-center">
      <!-- カテゴリーサムネイル -->
      <div class="border-border bg-muted mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border">
        <img
          v-if="thumbnailImage && !isLoadingThumbnail"
          :src="`data:${thumbnailImage.mimeType};base64,${thumbnailImage.base64Data}`"
          :alt="category.name"
          class="h-full w-full object-cover"
        />
        <Icon
          v-else-if="isLoadingThumbnail"
          icon="line-md:loading-alt-loop"
          class="text-muted-foreground size-20 animate-spin sm:size-24"
        />
        <Icon
          v-else
          icon="material-symbols:landscape"
          class="text-muted-foreground size-20 sm:size-24"
        />
      </div>

      <h3 class="mb-2 line-clamp-2 text-lg font-semibold">{{ category.name }}</h3>

      <div
        v-if="category.description"
        class="text-muted-foreground line-clamp-3 text-sm"
      >
        {{ category.description }}
      </div>
    </div>

    <!-- アクションボタン（ホバー時に表示） -->
    <div class="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div class="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          class="bg-background/80 hover:bg-background h-8 w-8 p-0"
          @click.stop="editCategory"
        >
          <Icon
            icon="material-symbols:edit"
            class="h-4 w-4"
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="bg-background/80 hover:bg-background text-destructive hover:text-destructive h-8 w-8 p-0"
          @click.stop="deleteCategory"
        >
          <Icon
            icon="material-symbols:delete"
            class="h-4 w-4"
          />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { BackgroundCategoryRecord, BackgroundImageRecord } from '~/types/database'
import { useBackgroundImages } from '~/composables/useBackgroundImages'
import { logger } from '~/utils/logger'

interface Props {
  category: BackgroundCategoryRecord
}

interface Emits {
  select: [category: BackgroundCategoryRecord]
  edit: [category: BackgroundCategoryRecord]
  delete: [category: BackgroundCategoryRecord]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getCategoryImages } = useBackgroundImages()
const thumbnailImage = ref<BackgroundImageRecord | null>(null)
const isLoadingThumbnail = ref(true)

// サムネイル画像を読み込み（最初の画像）
const loadThumbnail = async () => {
  try {
    isLoadingThumbnail.value = true
    const images = await getCategoryImages(props.category.id)
    if (images.length > 0) {
      thumbnailImage.value = images[0] || null
    }
  } catch (error) {
    // カテゴリが削除された場合のエラーを適切に処理
    logger.warn(
      'サムネイル画像の読み込みに失敗（カテゴリが削除された可能性）',
      {
        component: 'BackgroundCategoryCard',
        categoryId: props.category.id,
      },
      error
    )
    // サムネイルをクリアしてデフォルトアイコンを表示
    thumbnailImage.value = null
  } finally {
    isLoadingThumbnail.value = false
  }
}

// カテゴリーを選択
const selectCategory = () => {
  emit('select', props.category)
}

// カテゴリーを編集
const editCategory = () => {
  emit('edit', props.category)
}

// カテゴリーを削除
const deleteCategory = () => {
  emit('delete', props.category)
}

// カテゴリIDの変更を監視してサムネイルを再読み込み
// immediate: true により、初回マウント時にも実行される
watch(
  () => props.category.id,
  () => {
    loadThumbnail()
  },
  { immediate: true }
)
</script>
