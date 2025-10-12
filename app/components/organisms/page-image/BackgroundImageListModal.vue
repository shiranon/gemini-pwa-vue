<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="flex h-[80vh] min-h-[600px] w-full max-w-[95vw] flex-col overflow-hidden sm:max-w-3xl">
      <DialogHeader class="flex-shrink-0">
        <DialogTitle>背景画像管理</DialogTitle>
        <DialogDescription>{{ category.name }}の画像</DialogDescription>
      </DialogHeader>

      <!-- エラー表示 -->
      <div
        v-if="error"
        class="border-destructive bg-destructive/10 text-destructive mx-4 rounded-md border p-3 text-sm"
      >
        {{ error }}
      </div>

      <!-- メインコンテンツ -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- アクションボタン -->
        <div class="mb-4 flex-shrink-0">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="showUploadModal = true"
              >
                <Icon
                  icon="material-symbols:add"
                  class="h-4 w-4"
                />
                画像を追加
              </Button>
              <Button
                v-if="selectedImages.size > 0"
                variant="destructive"
                size="sm"
                @click="deleteSelectedImages"
              >
                <Icon
                  icon="material-symbols:delete"
                  class="h-4 w-4"
                />
                選択削除 ({{ selectedImages.size }})
              </Button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                @click="selectAllImages"
              >
                <Icon
                  icon="material-symbols:select-all"
                  class="h-4 w-4"
                />
                <span class="hidden sm:inline">すべて選択</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="clearSelection"
              >
                <Icon
                  icon="material-symbols:clear-all"
                  class="h-4 w-4"
                />
                <span class="hidden sm:inline">選択解除</span>
              </Button>
            </div>
          </div>
        </div>

        <!-- 画像一覧 -->
        <div
          v-if="images.length > 0"
          class="max-h-[65vh] min-h-0 flex-1 overflow-y-auto"
        >
          <div class="grid grid-cols-2 gap-3 px-2 sm:grid-cols-3">
            <div
              v-for="image in images"
              :key="image.id"
              class="border-border bg-card group relative cursor-pointer rounded-lg border p-2 transition-all duration-200 hover:shadow-lg"
              :class="{ 'ring-primary ring-2': selectedImages.has(image.id) }"
              @click="toggleImageSelection(image.id)"
            >
              <!-- 選択チェックボックス -->
              <div class="absolute top-2 left-2 z-10">
                <div
                  class="bg-background/80 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all"
                  :class="selectedImages.has(image.id) ? 'border-primary bg-primary' : 'border-border'"
                >
                  <Icon
                    v-if="selectedImages.has(image.id)"
                    icon="material-symbols:check"
                    class="text-primary-foreground h-4 w-4"
                  />
                </div>
              </div>

              <!-- 画像プレビュー -->
              <div class="aspect-square w-full overflow-hidden rounded-md">
                <img
                  :src="`data:${image.mimeType};base64,${image.base64Data}`"
                  :alt="image.name"
                  class="h-full w-full object-cover"
                />
              </div>

              <!-- 画像名 -->
              <div class="mt-2 text-center">
                <p class="text-foreground line-clamp-1 text-sm font-medium">{{ image.name }}</p>
                <p class="text-muted-foreground text-xs">{{ formatFileSize(image.size) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 空の状態 -->
        <div
          v-else
          class="flex flex-1 flex-col items-center justify-center text-center"
        >
          <Icon
            icon="material-symbols:image-not-supported"
            class="text-muted-foreground mb-4 h-16 w-16"
          />
          <p class="text-muted-foreground mb-4 text-sm">まだ画像がありません</p>
          <Button
            variant="outline"
            @click="showUploadModal = true"
          >
            <Icon
              icon="material-symbols:add"
              class="mr-2 h-4 w-4"
            />
            最初の画像を追加
          </Button>
        </div>
      </div>

      <!-- 閉じるボタン -->
      <div class="flex-shrink-0 border-t pt-4">
        <div class="flex justify-end">
          <Button
            variant="outline"
            @click="handleClose"
          >
            閉じる
          </Button>
        </div>
      </div>
    </DialogContent>

    <!-- 画像アップロードモーダル -->
    <BackgroundImageUploadModal
      v-if="showUploadModal"
      :category="category"
      @close="handleUploadModalClose"
      @uploaded="handleImageUploaded"
    />

    <!-- 確認ダイアログ -->
    <ConfirmDialog
      v-model="isConfirmDialogOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      @confirm="handleConfirmOk"
      @cancel="handleConfirmCancel"
    />
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import BackgroundImageUploadModal from '~/components/organisms/page-image/BackgroundImageUploadModal.vue'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import { useBackgroundImages } from '~/composables/useBackgroundImages'
import { logger } from '~/utils/logger'
import type { BackgroundCategoryRecord, BackgroundImageRecord } from '~/types/database'

interface Props {
  category: BackgroundCategoryRecord
}

interface Emits {
  close: []
  back: []
  updated: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getCategoryImages, deleteImage } = useBackgroundImages()

// Dialogの開閉状態
const isOpen = ref(true)

// 状態管理
const images = ref<BackgroundImageRecord[]>([])
const error = ref<string | null>(null)
const showUploadModal = ref(false)
const selectedImages = ref<Set<string>>(new Set())

// 確認ダイアログの状態管理
const isConfirmDialogOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmResolve = ref<((value: boolean) => void) | null>(null)

// 確認ダイアログを表示
const showConfirm = (message: string, title = '確認'): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmTitle.value = title
    confirmMessage.value = message
    confirmResolve.value = resolve
    isConfirmDialogOpen.value = true
  })
}

// 確認ダイアログのハンドラー
const handleConfirmOk = () => {
  if (confirmResolve.value) {
    confirmResolve.value(true)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
}

const handleConfirmCancel = () => {
  if (confirmResolve.value) {
    confirmResolve.value(false)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
}

// 画像一覧を読み込み
const loadImages = async () => {
  try {
    error.value = null
    images.value = await getCategoryImages(props.category.id)
  } catch (err) {
    error.value = '画像の読み込みに失敗しました'
    logger.error('画像の読み込みに失敗', { component: 'BackgroundImageListModal' }, err)
  }
}

// 画像の選択状態を切り替え
const toggleImageSelection = (imageId: string) => {
  if (selectedImages.value.has(imageId)) {
    selectedImages.value.delete(imageId)
  } else {
    selectedImages.value.add(imageId)
  }
}

// すべての画像を選択
const selectAllImages = () => {
  selectedImages.value = new Set(images.value.map((img) => img.id))
}

// 選択を解除
const clearSelection = () => {
  selectedImages.value.clear()
}

// 選択した画像を削除
const deleteSelectedImages = async () => {
  const confirmed = await showConfirm(`選択した${selectedImages.value.size}件の画像を削除しますか？`, '画像の削除')
  if (!confirmed) {
    return
  }

  try {
    const deletePromises = Array.from(selectedImages.value).map((imageId) => deleteImage(imageId))
    await Promise.all(deletePromises)

    await loadImages()
    clearSelection()
    // サムネイル更新のため親に通知
    emit('updated')
  } catch (err) {
    error.value = '画像の削除に失敗しました'
    logger.error('画像の削除に失敗', { component: 'BackgroundImageListModal' }, err)
  }
}

// ファイルサイズをフォーマット
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// アップロードモーダルを閉じる
const handleUploadModalClose = () => {
  showUploadModal.value = false
}

// 画像アップロード完了
const handleImageUploaded = async () => {
  await loadImages()
  showUploadModal.value = false
  // サムネイル更新のため親に通知
  emit('updated')
}

// ダイアログを閉じる
const handleClose = () => {
  isOpen.value = false
}

// ダイアログが閉じられた時にcloseイベントを発火
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('close')
  }
})

// 初期化
onMounted(() => {
  loadImages()
})
</script>
