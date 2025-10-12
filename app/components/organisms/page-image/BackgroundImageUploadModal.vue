<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="mx-4 max-w-2xl">
      <DialogHeader>
        <DialogTitle>画像を追加</DialogTitle>
        <DialogDescription>{{ category.name }}に画像を追加します</DialogDescription>
      </DialogHeader>

      <!-- エラー表示 -->
      <div
        v-if="error"
        class="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
      >
        {{ error }}
      </div>

      <!-- ファイル選択 -->
      <div class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium">画像ファイルを選択</label>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="border-border bg-background text-foreground ring-offset-background focus-visible:ring-ring file:border-border file:bg-muted file:text-foreground w-full cursor-pointer rounded-md border text-sm file:mr-4 file:rounded-l-md file:border-0 file:border-r file:px-4 file:py-2 file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isUploading"
            @change="handleFileSelect"
          />
          <p class="text-muted-foreground mt-1 text-xs">複数のファイルを選択できます（PNG, JPG, WEBP対応）</p>
        </div>

        <!-- 選択された画像のプレビューとフォーム -->
        <div
          v-if="selectedFiles.length > 0"
          class="max-h-[50vh] space-y-3 overflow-y-auto rounded-md border p-4"
        >
          <div
            v-for="(fileData, index) in selectedFiles"
            :key="index"
            class="border-border flex items-start gap-3 rounded-md border p-3"
          >
            <!-- プレビュー画像 -->
            <div class="flex-shrink-0">
              <img
                :src="fileData.preview"
                :alt="fileData.name"
                class="h-20 w-20 rounded-md object-cover"
              />
            </div>

            <!-- フォーム -->
            <div class="flex-1 space-y-2">
              <div>
                <label class="text-xs font-medium">画像名</label>
                <Input
                  v-model="fileData.name"
                  placeholder="画像名を入力"
                  class="mt-1"
                  :disabled="isUploading"
                />
              </div>
              <div class="text-muted-foreground text-xs">ファイルサイズ: {{ formatFileSize(fileData.file.size) }}</div>
            </div>

            <!-- 削除ボタン -->
            <Button
              variant="ghost"
              size="sm"
              class="text-destructive hover:text-destructive flex-shrink-0"
              :disabled="isUploading"
              @click="removeFile(index)"
            >
              <Icon
                icon="material-symbols:close"
                class="h-4 w-4"
              />
            </Button>
          </div>
        </div>

        <!-- アップロード進捗 -->
        <div
          v-if="isUploading"
          class="space-y-2"
        >
          <div class="flex items-center gap-2">
            <Icon
              icon="material-symbols:loading"
              class="h-5 w-5 animate-spin"
            />
            <span class="text-sm">アップロード中... ({{ uploadProgress }}/{{ selectedFiles.length }})</span>
          </div>
        </div>
      </div>

      <!-- ボタン -->
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          class="w-full sm:w-auto"
          :disabled="isUploading"
          @click="handleClose"
        >
          キャンセル
        </Button>
        <Button
          type="button"
          class="w-full sm:w-auto"
          :disabled="isUploadButtonDisabled"
          @click="handleUpload"
        >
          <Icon
            v-if="isUploading"
            icon="material-symbols:loading"
            class="mr-2 h-4 w-4 animate-spin"
          />
          <Icon
            v-else
            icon="material-symbols:upload"
            class="mr-2 h-4 w-4"
          />
          アップロード ({{ selectedFiles.length }}件)
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { useBackgroundImages } from '~/composables/useBackgroundImages'
import { logger } from '~/utils/logger'
import type { BackgroundCategoryRecord } from '~/types/database'

interface Props {
  category: BackgroundCategoryRecord
}

interface Emits {
  close: []
  uploaded: []
}

interface FileData {
  file: File
  name: string
  preview: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { uploadImage } = useBackgroundImages()

// Dialogの開閉状態
const isOpen = ref(true)

// 状態管理
const fileInputRef = ref<HTMLInputElement>()
const selectedFiles = ref<FileData[]>([])
const isUploading = ref(false)
const uploadProgress = ref(0)
const error = ref<string | null>(null)

// フォームのバリデーション
const isFormValid = computed(() => {
  // ファイルが選択されている場合は常に有効とする
  // 個別のファイル名は必須ではない
  const isValid = selectedFiles.value.length > 0
  return isValid
})

// アップロードボタンの状態
const isUploadButtonDisabled = computed(() => {
  const disabled = selectedFiles.value.length === 0 || isUploading.value || !isFormValid.value
  return disabled
})

// ファイル選択時の処理
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  error.value = null

  // 選択されたファイルを処理
  Array.from(files).forEach((file) => {
    // 画像ファイルのみを受け付ける
    if (!file.type.startsWith('image/')) {
      logger.warn('画像ファイルではありません', { component: 'BackgroundImageUploadModal' }, { fileName: file.name })
      return
    }

    // プレビュー用のURLを作成
    const preview = URL.createObjectURL(file)

    // ファイル名から拡張子を除いた名前を抽出
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    // 空の場合は元のファイル名を使用
    const displayName = nameWithoutExt.trim() !== '' ? nameWithoutExt : file.name

    if (import.meta.dev) {
      logger.debug(
        'ファイル選択処理',
        { component: 'BackgroundImageUploadModal' },
        {
          originalName: file.name,
          nameWithoutExt,
          displayName,
          isEmpty: displayName.trim() === '',
        }
      )
    }

    selectedFiles.value.push({
      file,
      name: displayName,
      preview,
    })
  })

  // inputをリセット（同じファイルを再選択できるように）
  if (input) {
    input.value = ''
  }
}

// ファイルを削除
const removeFile = (index: number) => {
  const fileData = selectedFiles.value[index]
  if (fileData) {
    // プレビューURLを解放
    URL.revokeObjectURL(fileData.preview)
  }
  selectedFiles.value.splice(index, 1)
}

// ファイルサイズをフォーマット
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// アップロード処理
const handleUpload = async () => {
  if (selectedFiles.value.length === 0) return

  try {
    isUploading.value = true
    uploadProgress.value = 0
    error.value = null

    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    // 各ファイルを順番にアップロード
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const fileData = selectedFiles.value[i]
      if (!fileData) continue

      try {
        const result = await uploadImage(props.category.id, fileData.name.trim(), fileData.file)
        if (result) {
          successCount++
          logger.info(`画像アップロード成功: ${fileData.name}`, { component: 'BackgroundImageUploadModal' })
        } else {
          failCount++
          errors.push(fileData.name)
        }
      } catch (fileError) {
        failCount++
        errors.push(fileData.name)
        logger.error(`画像アップロードエラー: ${fileData.name}`, { component: 'BackgroundImageUploadModal' }, fileError)
      }

      // 進捗を更新
      uploadProgress.value = i + 1
    }

    if (failCount > 0) {
      error.value = `${failCount}件のアップロードに失敗しました: ${errors.join(', ')}`
      logger.warn('一部の画像のアップロードに失敗', { component: 'BackgroundImageUploadModal' }, { successCount, failCount })
    }

    if (successCount > 0) {
      // 成功した場合は完了イベントを発火
      emit('uploaded')
    }
  } catch (err) {
    error.value = 'アップロードに失敗しました'
    logger.error('画像アップロードエラー', { component: 'BackgroundImageUploadModal' }, err)
  } finally {
    isUploading.value = false
  }
}

// モーダルを閉じる
const handleClose = () => {
  if (isUploading.value) {
    return // アップロード中は閉じない
  }
  isOpen.value = false
}

// ダイアログが閉じられた時にcloseイベントを発火
watch(isOpen, (newValue) => {
  if (!newValue) {
    // プレビューURLをクリーンアップ
    selectedFiles.value.forEach((fileData) => {
      URL.revokeObjectURL(fileData.preview)
    })
    emit('close')
  }
})
</script>
