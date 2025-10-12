<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="mx-4 max-w-md">
      <DialogHeader>
        <DialogTitle>新しいカテゴリーを作成</DialogTitle>
        <DialogDescription>背景画像のカテゴリー情報を入力してください</DialogDescription>
      </DialogHeader>

      <!-- 作成フォーム -->
      <form
        class="space-y-4"
        @submit.prevent="handleCreate"
      >
        <div>
          <label class="text-sm font-medium">カテゴリー名</label>
          <Input
            v-model="form.name"
            placeholder="カテゴリー名を入力（例: 屋外、屋内、戦闘）"
            class="mt-1"
            :disabled="isCreating"
          />
        </div>

        <div>
          <label class="text-sm font-medium">説明（任意）</label>
          <textarea
            v-model="form.description"
            placeholder="カテゴリーの説明を入力"
            class="border-border bg-background text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:ring-ring mt-1 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isCreating"
          />
        </div>

        <!-- フォルダ選択オプション -->
        <div class="space-y-2">
          <label class="text-sm font-medium">画像を一括登録（オプション）</label>
          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              class="flex-1"
              :disabled="isCreating || !folderUpload.isSupported.value"
              @click="handleSelectFolder"
            >
              <Icon
                icon="material-symbols:folder-open"
                class="mr-2 h-4 w-4"
              />
              フォルダを選択
            </Button>
            <Button
              v-if="selectedImages.length > 0"
              type="button"
              variant="ghost"
              size="sm"
              :disabled="isCreating"
              @click="clearSelectedImages"
            >
              <Icon
                icon="material-symbols:close"
                class="h-4 w-4"
              />
            </Button>
          </div>
          <div
            v-if="selectedImages.length > 0"
            class="bg-muted rounded-md p-3 text-sm"
          >
            <div class="font-medium">選択された画像:</div>
            <div class="text-muted-foreground text-xs">{{ selectedImages.length }}枚の画像</div>
          </div>
          <div
            v-if="!folderUpload.isSupported"
            class="text-muted-foreground text-xs"
          >
            このブラウザはフォルダ選択をサポートしていません
          </div>
        </div>

        <!-- エラーメッセージ -->
        <div
          v-if="errorMessage"
          class="text-destructive text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- ボタン -->
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            class="w-full sm:w-auto"
            :disabled="isCreating"
            @click="handleCancel"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            class="w-full sm:w-auto"
            :disabled="!form.name.trim() || isCreating"
          >
            <Icon
              v-if="isCreating"
              icon="material-symbols:loading"
              class="mr-2 h-4 w-4 animate-spin"
            />
            作成
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useBackgroundImages } from '~/composables/useBackgroundImages'
import { useFolderUpload } from '~/composables/useFolderUpload'
import { logger } from '~/utils/logger'
import type { BackgroundCategoryRecord } from '~/types/database'

interface Props {
  open: boolean
}

interface Emits {
  'update:open': [value: boolean]
  created: [category: BackgroundCategoryRecord]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createCategory, bulkUploadImages } = useBackgroundImages()
const folderUpload = useFolderUpload()

// フォルダ選択サポートの確認
onMounted(() => {
  folderUpload.checkSupport()
})

// ダイアログの開閉状態
const isOpen = ref(props.open)

watch(
  () => props.open,
  (newValue) => {
    isOpen.value = newValue
  }
)

watch(isOpen, (newValue) => {
  emit('update:open', newValue)
  if (!newValue) {
    resetForm()
  }
})

// フォームデータ
const form = ref({
  name: '',
  description: '',
})

const isCreating = ref(false)
const errorMessage = ref('')
const selectedImages = ref<File[]>([])

// フォルダ選択
const handleSelectFolder = async () => {
  try {
    const result = await folderUpload.selectImageFolder()
    if (result) {
      // フォルダ名を自動的にカテゴリー名に設定
      form.value.name = result.folderName
      selectedImages.value = result.images
      logger.info(`フォルダ「${result.folderName}」から${result.images.length}枚の画像を選択`, { component: 'BackgroundCategoryCreateModal' })
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'フォルダの選択に失敗しました'
    logger.error('フォルダ選択エラー', { component: 'BackgroundCategoryCreateModal' }, error)
  }
}

// 選択した画像をクリア
const clearSelectedImages = () => {
  selectedImages.value = []
}

// フォームをリセット
const resetForm = () => {
  form.value = {
    name: '',
    description: '',
  }
  errorMessage.value = ''
  selectedImages.value = []
}

// カテゴリーを作成
const handleCreate = async () => {
  try {
    isCreating.value = true
    errorMessage.value = ''

    const category = await createCategory(form.value.name.trim(), form.value.description?.trim() || undefined)

    if (!category) {
      errorMessage.value = 'カテゴリーの作成に失敗しました'
      return
    }

    // 選択された画像があれば一括アップロード
    if (selectedImages.value.length > 0) {
      logger.info(`${selectedImages.value.length}枚の画像をアップロード開始`, { component: 'BackgroundCategoryCreateModal' })

      const result = await bulkUploadImages(category.id, selectedImages.value)

      if (result.failed > 0) {
        logger.warn(`一部の画像のアップロードに失敗: 成功${result.success}件、失敗${result.failed}件`, { component: 'BackgroundCategoryCreateModal' })
      } else {
        logger.info(`全ての画像をアップロード成功: ${result.success}件`, { component: 'BackgroundCategoryCreateModal' })
      }
    }

    emit('created', category)
    isOpen.value = false
  } catch (error) {
    logger.error('カテゴリー作成エラー', { component: 'BackgroundCategoryCreateModal' }, error)
    errorMessage.value = error instanceof Error ? error.message : 'カテゴリーの作成に失敗しました'
  } finally {
    isCreating.value = false
  }
}

// キャンセル
const handleCancel = () => {
  isOpen.value = false
}
</script>
