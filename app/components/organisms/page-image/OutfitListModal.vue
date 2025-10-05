<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="flex h-[80vh] min-h-[600px] w-full max-w-[95vw] flex-col overflow-hidden sm:max-w-3xl">
      <DialogHeader class="flex-shrink-0">
        <DialogTitle>キャラクター画像管理</DialogTitle>
        <DialogDescription>{{ character.name }}の衣装と画像</DialogDescription>
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
        <!-- 衣装タブ -->
        <div
          v-if="outfits.length > 0"
          class="flex flex-col space-y-4"
        >
          <!-- タブナビゲーション（固定） -->
          <div class="flex-shrink-0">
            <div class="border-border flex flex-wrap gap-2 rounded-lg border p-2">
              <!-- 衣装追加ボタン -->
              <button
                class="border-border bg-muted/50 hover:bg-muted flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                @click="showCreateOutfitModal = true"
              >
                <Icon
                  icon="material-symbols:add"
                  class="h-4 w-4"
                />
                <span class="hidden sm:inline">衣装を追加</span>
              </button>

              <!-- 衣装タブ -->
              <button
                v-for="outfit in outfits"
                :key="outfit.id"
                class="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors"
                :class="{
                  'bg-primary text-primary-foreground': selectedOutfit?.id === outfit.id,
                  'text-muted-foreground hover:text-foreground': selectedOutfit?.id !== outfit.id,
                }"
                @click="selectOutfit(outfit)"
              >
                {{ outfit.name }}
              </button>
            </div>
          </div>

          <!-- 選択された衣装の画像一覧 -->
          <div
            v-if="selectedOutfit"
            class="flex flex-1 flex-col overflow-hidden"
          >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="editOutfit(selectedOutfit)"
                  >
                    <Icon
                      icon="material-symbols:edit"
                      class="h-4 w-4"
                    />
                    <span class="hidden sm:inline">衣装を編集</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="deleteOutfit(selectedOutfit)"
                  >
                    <Icon
                      icon="material-symbols:delete"
                      class="h-4 w-4"
                    />
                    <span class="hidden sm:inline">衣装を削除</span>
                  </Button>
                </div>
              </div>
            </div>

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
                      class="border-border bg-background flex h-5 w-5 items-center justify-center rounded border"
                      :class="{ 'bg-primary border-primary': selectedImages.has(image.id) }"
                    >
                      <Icon
                        v-if="selectedImages.has(image.id)"
                        icon="material-symbols:check"
                        class="text-primary-foreground h-3 w-3"
                      />
                    </div>
                  </div>

                  <!-- 画像 -->
                  <div class="aspect-square overflow-hidden rounded">
                    <img
                      :src="`data:${image.mimeType};base64,${image.base64Data}`"
                      :alt="`${image.expression}の画像`"
                      class="h-full w-full object-cover"
                    />
                  </div>

                  <!-- 表情名 -->
                  <div class="mt-2 text-center">
                    <div class="truncate text-sm font-medium">{{ image.expression }}</div>
                    <div class="text-muted-foreground text-xs">
                      {{ formatFileSize(image.size) }}
                    </div>
                  </div>

                  <!-- ホバー時の削除ボタン -->
                  <div class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="destructive"
                      size="sm"
                      @click.stop="deleteImage(image)"
                    >
                      <Icon
                        icon="material-symbols:delete"
                        class="h-3 w-3"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 空状態 -->
            <div
              v-else
              class="flex max-h-[50vh] min-h-0 flex-1 items-center justify-center"
            >
              <EmptyState
                icon="material-symbols:image"
                title="画像がありません"
                description="最初の画像をアップロードしてください"
              >
                <Button @click="showUploadModal = true">
                  <Icon
                    icon="material-symbols:add"
                    class="mr-2 h-4 w-4"
                  />
                  画像をアップロード
                </Button>
              </EmptyState>
            </div>
          </div>
        </div>

        <!-- 衣装が存在しない場合の空状態 -->
        <div
          v-else
          class="flex flex-1 items-center justify-center"
        >
          <EmptyState
            icon="material-symbols:checkroom"
            title="衣装がありません"
            description="最初の衣装を作成してください"
          >
            <Button @click="showCreateOutfitModal = true">
              <Icon
                icon="material-symbols:add"
                class="mr-2 h-4 w-4"
              />
              衣装を追加
            </Button>
          </EmptyState>
        </div>
      </div>
    </DialogContent>

    <!-- 編集モーダル -->
    <OutfitEditModal
      v-if="editingOutfit"
      :outfit="editingOutfit"
      @close="editingOutfit = null"
      @updated="handleOutfitUpdated"
    />

    <!-- 画像アップロードモーダル -->
    <ExpressionUploadModal
      v-if="showUploadModal && selectedOutfit"
      :character="character"
      :outfit="selectedOutfit"
      @close="showUploadModal = false"
      @uploaded="handleImagesUploaded"
    />

    <!-- 衣装作成モーダル -->
    <Dialog v-model:open="showCreateOutfitModal">
      <DialogContent class="mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle>新しい衣装を作成</DialogTitle>
          <DialogDescription>{{ character.name }}の新しい衣装を作成します</DialogDescription>
        </DialogHeader>

        <form
          class="space-y-4"
          @submit.prevent="handleCreateOutfit"
        >
          <div>
            <label class="text-sm font-medium">衣装名</label>
            <Input
              v-model="newOutfitName"
              placeholder="衣装名を入力"
              class="mt-1"
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
                :disabled="isCreating || !folderUpload.isSupported"
                @click="handleSelectFolder"
              >
                <Icon
                  icon="material-symbols:folder-open"
                  class="mr-2 h-4 w-4"
                />
                フォルダを選択
              </Button>
              <Button
                v-if="selectedFolder"
                type="button"
                variant="ghost"
                size="sm"
                :disabled="isCreating"
                @click="clearSelectedFolder"
              >
                <Icon
                  icon="material-symbols:close"
                  class="h-4 w-4"
                />
              </Button>
            </div>
            <div
              v-if="selectedFolder"
              class="bg-muted rounded-md p-3 text-sm"
            >
              <div class="font-medium">選択されたフォルダ:</div>
              <div class="text-muted-foreground">{{ selectedFolder.outfits[0]?.outfitName || '不明' }}</div>
              <div class="mt-1 text-xs">{{ totalImages }}枚の画像</div>
            </div>
            <div
              v-if="!folderUpload.isSupported"
              class="text-muted-foreground text-xs"
            >
              このブラウザはフォルダ選択をサポートしていません
            </div>
          </div>

          <!-- プログレス表示 -->
          <BulkUploadProgress
            v-if="isCreating && selectedFolder"
            :progress="folderUpload.progress.value"
          />

          <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              class="w-full sm:w-auto"
              @click="showCreateOutfitModal = false"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              class="w-full sm:w-auto"
              :disabled="!newOutfitName.trim() || isCreating"
            >
              <Icon
                v-if="isCreating"
                icon="material-symbols:loading"
                class="mr-2 h-4 w-4 animate-spin"
              />
              <Icon
                v-else
                icon="material-symbols:add"
                class="mr-2 h-4 w-4"
              />
              {{ selectedFolder ? '作成して画像を登録' : '作成' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

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
import { computed, ref, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import EmptyState from '~/components/common/ImageEmptyState.vue'
import OutfitEditModal from '~/components/organisms/page-image/OutfitEditModal.vue'
import ExpressionUploadModal from '~/components/organisms/page-image/ExpressionUploadModal.vue'
import BulkUploadProgress from '~/components/molecules/BulkUploadProgress.vue'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { useFolderUpload, type FolderStructure } from '~/composables/useFolderUpload'
import { logger } from '~/utils/logger'
import type { CharacterRecord, CharacterOutfitRecord, CharacterImageRecord } from '~/types/database'

interface Props {
  character: CharacterRecord
}

interface Emits {
  close: []
  back: []
  outfitSelected: [outfit: CharacterOutfitRecord]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getOutfits, createOutfit, deleteOutfit: deleteOutfitFromDB, getOutfitAllExpressions, deleteImage: deleteImageFromDB, bulkAddOutfitsFromFolder, error } = useCharacterImages()
const folderUpload = useFolderUpload()

// Dialogの開閉状態
const isOpen = ref(true)

// 状態管理
const outfits = ref<CharacterOutfitRecord[]>([])
const selectedOutfit = ref<CharacterOutfitRecord | null>(null)
const images = ref<CharacterImageRecord[]>([])
const selectedImages = ref<Set<string>>(new Set())
const newOutfitName = ref('')
const isCreating = ref(false)
const editingOutfit = ref<CharacterOutfitRecord | null>(null)
const showUploadModal = ref(false)
const showCreateOutfitModal = ref(false)
const selectedFolder = ref<FolderStructure | null>(null)

// 計算プロパティ
const totalImages = computed(() => {
  if (!selectedFolder.value) return 0
  return selectedFolder.value.outfits.reduce((sum, outfit) => sum + outfit.images.length, 0)
})

// ダイアログの状態管理
const isConfirmDialogOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmResolve = ref<((value: boolean) => void) | null>(null)

// ダイアログ表示関数
const showConfirm = (message: string, title = '確認'): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmTitle.value = title
    confirmMessage.value = message
    confirmResolve.value = resolve
    isConfirmDialogOpen.value = true
  })
}

// ダイアログハンドラー
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

// 衣装一覧を読み込み
const loadOutfits = async () => {
  try {
    outfits.value = await getOutfits(props.character.id)
  } catch (err) {
    logger.error('衣装一覧の読み込みに失敗', { component: 'OutfitListModal' }, err)
  }
}

// フォルダを選択
const handleSelectFolder = async () => {
  try {
    const folderStructure = await folderUpload.selectOutfitFolder()
    if (folderStructure) {
      selectedFolder.value = folderStructure
      // フォルダ名を衣装名に自動設定（最初の衣装名を使用）
      if (!newOutfitName.value.trim() && folderStructure.outfits.length > 0) {
        newOutfitName.value = folderStructure.outfits[0]?.outfitName || ''
      }
    }
  } catch (error) {
    logger.error('フォルダ選択に失敗', { component: 'OutfitListModal' }, error)
  }
}

// 選択されたフォルダをクリア
const clearSelectedFolder = () => {
  selectedFolder.value = null
}

// 衣装を作成
const handleCreateOutfit = async () => {
  if (!newOutfitName.value.trim()) return

  try {
    isCreating.value = true

    if (selectedFolder.value) {
      // フォルダから一括作成
      const result = await bulkAddOutfitsFromFolder(props.character.id, selectedFolder.value)

      // 結果をログに記録
      if (result.errors.length > 0) {
        logger.warn(`一括アップロード完了: 成功${result.success}件、失敗${result.failed}件`, { component: 'OutfitListModal' })
        logger.warn('アップロードエラー:', { component: 'OutfitListModal' }, result.errors)
      } else {
        logger.info(`一括アップロード完了: 成功${result.success}件`, { component: 'OutfitListModal' })
      }

      newOutfitName.value = ''
      selectedFolder.value = null
      showCreateOutfitModal.value = false
      await loadOutfits()
    } else {
      // 通常の作成
      const newOutfit = await createOutfit(props.character.id, newOutfitName.value.trim())
      if (newOutfit) {
        newOutfitName.value = ''
        showCreateOutfitModal.value = false
        await loadOutfits()
        // 新しく作成された衣装を自動選択
        if (newOutfit) {
          await selectOutfit(newOutfit)
        }
      }
    }
  } catch (err) {
    logger.error('衣装の作成に失敗', { component: 'OutfitListModal' }, err)
  } finally {
    isCreating.value = false
  }
}

// 衣装を選択
const selectOutfit = async (outfit: CharacterOutfitRecord) => {
  selectedOutfit.value = outfit
  selectedImages.value.clear()
  await loadImages(outfit)
}

// 衣装を編集
const editOutfit = (outfit: CharacterOutfitRecord) => {
  editingOutfit.value = outfit
}

// 衣装を削除
const deleteOutfit = async (outfit: CharacterOutfitRecord) => {
  const confirmed = await showConfirm(`「${outfit.name}」を削除しますか？関連する画像もすべて削除されます。`, '衣装の削除')
  if (!confirmed) {
    return
  }

  try {
    const success = await deleteOutfitFromDB(outfit.id)
    if (success) {
      await loadOutfits()
    }
  } catch (err) {
    logger.error('衣装の削除に失敗', { component: 'OutfitListModal' }, err)
  }
}

// 画像一覧を読み込み
const loadImages = async (outfit: CharacterOutfitRecord) => {
  try {
    images.value = await getOutfitAllExpressions(props.character.id, outfit.id)
  } catch (err) {
    logger.error('画像一覧の読み込みに失敗', { component: 'OutfitListModal' }, err)
  }
}

// 画像の選択を切り替え
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

// 単一画像を削除
const deleteImage = async (image: CharacterImageRecord) => {
  const confirmed = await showConfirm(`「${image.expression}」の画像を削除しますか？`, '画像の削除')
  if (!confirmed) {
    return
  }

  try {
    const success = await deleteImageFromDB(image.id)
    if (success) {
      await loadImages(selectedOutfit.value!)
      selectedImages.value.delete(image.id)
    }
  } catch (err) {
    logger.error('画像の削除に失敗', { component: 'OutfitListModal' }, err)
  }
}

// 選択した画像を一括削除
const deleteSelectedImages = async () => {
  if (selectedImages.value.size === 0) return

  const selectedCount = selectedImages.value.size
  const confirmed = await showConfirm(`選択した${selectedCount}枚の画像を削除しますか？`, '画像の一括削除')
  if (!confirmed) {
    return
  }

  try {
    let successCount = 0
    for (const imageId of selectedImages.value) {
      const success = await deleteImageFromDB(imageId)
      if (success) {
        successCount++
      }
    }

    if (successCount > 0) {
      await loadImages(selectedOutfit.value!)
      selectedImages.value.clear()
    }
  } catch (err) {
    logger.error('一括削除に失敗', { component: 'OutfitListModal' }, err)
  }
}

// 画像アップロード完了時の処理
const handleImagesUploaded = async () => {
  if (selectedOutfit.value) {
    await loadImages(selectedOutfit.value)
  }
  showUploadModal.value = false
}

// ファイルサイズをフォーマット
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 衣装更新完了時の処理
const handleOutfitUpdated = async () => {
  await loadOutfits()
  editingOutfit.value = null
}

// Dialogの開閉を監視
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('close')
  }
})

// 初期化
onMounted(async () => {
  await loadOutfits()
  // 最初の衣装を自動選択
  if (outfits.value.length > 0) {
    await selectOutfit(outfits.value[0]!)
  }
})
</script>
