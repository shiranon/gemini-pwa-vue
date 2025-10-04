<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>表情画像をアップロード</DialogTitle>
        <DialogDescription>{{ character.name }} - {{ outfit.name }}</DialogDescription>
      </DialogHeader>

      <!-- アップロード方法選択 -->
      <div class="mb-6">
        <div class="flex gap-2">
          <Button
            :variant="uploadMode === 'single' ? 'default' : 'outline'"
            @click="uploadMode = 'single'"
          >
            単一画像
          </Button>
          <Button
            :variant="uploadMode === 'bulk' ? 'default' : 'outline'"
            @click="uploadMode = 'bulk'"
          >
            一括アップロード
          </Button>
        </div>
      </div>

      <!-- 単一画像アップロード -->
      <div
        v-if="uploadMode === 'single'"
        class="space-y-4"
      >
        <div>
          <label class="text-sm font-medium">表情名</label>
          <Input
            v-model="singleExpression"
            placeholder="表情名を入力（例：笑顔、怒り、悲しみ）"
            class="mt-1"
            :disabled="isUploading"
          />
        </div>

        <div>
          <label class="text-sm font-medium">画像ファイル</label>
          <div class="mt-1">
            <input
              ref="singleFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleSingleFileSelect"
            />
            <Button
              type="button"
              variant="outline"
              :disabled="isUploading"
              class="w-full"
              @click="singleFileInput?.click()"
            >
              <Icon
                icon="material-symbols:upload"
                class="mr-2 h-4 w-4"
              />
              {{ selectedSingleFile ? selectedSingleFile.name : '画像を選択' }}
            </Button>
          </div>
        </div>

        <Button
          :disabled="!singleExpression.trim() || !selectedSingleFile || isUploading"
          class="w-full"
          @click="uploadSingleImage"
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
          アップロード
        </Button>
      </div>

      <!-- 一括アップロード -->
      <div
        v-else
        class="space-y-4"
      >
        <div>
          <label class="text-sm font-medium">画像ファイル（複数選択可）</label>
          <p class="text-muted-foreground mt-1 text-xs">ファイル名が表情名として使用されます（拡張子は除く）</p>
          <div class="mt-1">
            <input
              ref="bulkFileInput"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="handleBulkFileSelect"
            />
            <Button
              type="button"
              variant="outline"
              :disabled="isUploading"
              class="w-full"
              @click="bulkFileInput?.click()"
            >
              <Icon
                icon="material-symbols:upload"
                class="mr-2 h-4 w-4"
              />
              画像を選択（複数可）
            </Button>
          </div>
        </div>

        <!-- 選択されたファイル一覧 -->
        <div
          v-if="selectedBulkFiles.length > 0"
          class="space-y-2"
        >
          <h4 class="text-sm font-medium">選択されたファイル</h4>
          <div class="max-h-40 space-y-1 overflow-y-auto">
            <div
              v-for="file in selectedBulkFiles"
              :key="file.name"
              class="border-border bg-muted/50 flex items-center justify-between rounded border p-2"
            >
              <div class="flex items-center gap-2">
                <Icon
                  icon="material-symbols:image"
                  class="h-4 w-4"
                />
                <span class="text-sm">{{ file.name }}</span>
                <span class="text-muted-foreground text-xs"> ({{ formatFileSize(file.size) }}) </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="removeBulkFile(file)"
              >
                <Icon
                  icon="material-symbols:close"
                  class="h-3 w-3"
                />
              </Button>
            </div>
          </div>
        </div>

        <Button
          :disabled="selectedBulkFiles.length === 0 || isUploading"
          class="w-full"
          @click="uploadBulkImages"
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
          {{ selectedBulkFiles.length }}枚をアップロード
        </Button>
      </div>

      <!-- アップロード結果 -->
      <div
        v-if="uploadResult"
        class="mt-4 rounded-lg border p-4"
        :class="uploadResult.success > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'"
      >
        <h4 class="font-medium">アップロード結果</h4>
        <p class="text-sm">成功: {{ uploadResult.success }}件、 失敗: {{ uploadResult.failed }}件</p>
        <div
          v-if="uploadResult.errors.length > 0"
          class="mt-2"
        >
          <h5 class="text-sm font-medium">エラー詳細:</h5>
          <ul class="text-sm text-red-600">
            <li
              v-for="errorMessage in uploadResult.errors"
              :key="errorMessage"
            >
              {{ errorMessage }}
            </li>
          </ul>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { useCharacterImages } from '~/composables/useCharacterImages'
import type { CharacterRecord, CharacterOutfitRecord } from '~/types/database'

interface Props {
  character: CharacterRecord
  outfit: CharacterOutfitRecord
}

interface Emits {
  close: []
  uploaded: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { uploadImage, bulkUploadExpressions, error } = useCharacterImages()

// Dialogの開閉状態
const isOpen = ref(true)

// 状態管理
const uploadMode = ref<'single' | 'bulk'>('single')
const singleExpression = ref('')
const selectedSingleFile = ref<File | null>(null)
const selectedBulkFiles = ref<File[]>([])
const isUploading = ref(false)
const uploadResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

// ファイル入力の参照
const singleFileInput = ref<HTMLInputElement>()
const bulkFileInput = ref<HTMLInputElement>()

// 単一ファイル選択
const handleSingleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] || null
  selectedSingleFile.value = file
  uploadResult.value = null
}

// 一括ファイル選択
const handleBulkFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  selectedBulkFiles.value = files
  uploadResult.value = null
}

// 一括ファイルから削除
const removeBulkFile = (fileToRemove: File) => {
  selectedBulkFiles.value = selectedBulkFiles.value.filter((file) => file !== fileToRemove)
}

// 単一画像アップロード
const uploadSingleImage = async () => {
  if (!selectedSingleFile.value || !singleExpression.value.trim()) return

  try {
    isUploading.value = true
    uploadResult.value = null

    const success = await uploadImage(props.character.id, props.outfit.id, singleExpression.value.trim(), selectedSingleFile.value)

    if (success) {
      uploadResult.value = { success: 1, failed: 0, errors: [] }
      // フォームをリセット
      singleExpression.value = ''
      selectedSingleFile.value = null
      if (singleFileInput.value) {
        singleFileInput.value.value = ''
      }
      // 少し待ってからモーダルを閉じる
      setTimeout(() => {
        emit('uploaded')
      }, 1000)
    } else {
      uploadResult.value = { success: 0, failed: 1, errors: [error.value || 'アップロードに失敗しました'] }
    }
  } catch (err) {
    console.error('単一画像アップロードに失敗:', err)
    uploadResult.value = { success: 0, failed: 1, errors: [err instanceof Error ? err.message : 'アップロードに失敗しました'] }
  } finally {
    isUploading.value = false
  }
}

// 一括画像アップロード
const uploadBulkImages = async () => {
  if (selectedBulkFiles.value.length === 0) return

  try {
    isUploading.value = true
    uploadResult.value = null

    const result = await bulkUploadExpressions(props.character.id, props.outfit.id, selectedBulkFiles.value)

    uploadResult.value = result

    if (result.success > 0) {
      // 成功したファイルをリストから削除
      selectedBulkFiles.value = []
      if (bulkFileInput.value) {
        bulkFileInput.value.value = ''
      }
      // 少し待ってからモーダルを閉じる
      setTimeout(() => {
        emit('uploaded')
      }, 2000)
    }
  } catch (err) {
    console.error('一括画像アップロードに失敗:', err)
    uploadResult.value = { success: 0, failed: selectedBulkFiles.value.length, errors: [err instanceof Error ? err.message : 'アップロードに失敗しました'] }
  } finally {
    isUploading.value = false
  }
}

// ファイルサイズをフォーマット
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Dialogの開閉を監視
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('close')
  }
})
</script>
