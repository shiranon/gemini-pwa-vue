<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="flex min-h-[600px] w-full max-w-[95vw] flex-col overflow-hidden sm:max-w-3xl">
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
      <div class="flex-1 space-y-4 overflow-y-auto">
        <!-- 衣装タブ -->
        <div
          v-if="outfits.length > 0"
          class="space-y-4"
        >
          <!-- タブナビゲーション -->
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

          <!-- 選択された衣装の画像一覧 -->
          <div
            v-if="selectedOutfit"
            class="space-y-4"
          >
            <!-- 操作バー -->
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

            <!-- 画像グリッド -->
            <div
              v-if="images.length > 0"
              class="grid grid-cols-2 gap-3 px-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
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

            <!-- 空状態 -->
            <EmptyState
              v-else
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

        <!-- 衣装が存在しない場合の空状態 -->
        <EmptyState
          v-else
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
              作成
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import EmptyState from '~/components/common/ImageEmptyState.vue'
import OutfitEditModal from '~/components/organisms/page-image/OutfitEditModal.vue'
import ExpressionUploadModal from '~/components/organisms/page-image/ExpressionUploadModal.vue'
import { useCharacterImages } from '~/composables/useCharacterImages'
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

const { getOutfits, createOutfit, deleteOutfit: deleteOutfitFromDB, getOutfitAllExpressions, deleteImage: deleteImageFromDB, error } = useCharacterImages()

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

// 衣装一覧を読み込み
const loadOutfits = async () => {
  try {
    outfits.value = await getOutfits(props.character.id)
  } catch (err) {
    console.error('衣装一覧の読み込みに失敗:', err)
  }
}

// 衣装を作成
const handleCreateOutfit = async () => {
  if (!newOutfitName.value.trim()) return

  try {
    isCreating.value = true
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
  } catch (err) {
    console.error('衣装の作成に失敗:', err)
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
  if (!confirm(`「${outfit.name}」を削除しますか？関連する画像もすべて削除されます。`)) {
    return
  }

  try {
    const success = await deleteOutfitFromDB(outfit.id)
    if (success) {
      await loadOutfits()
    }
  } catch (err) {
    console.error('衣装の削除に失敗:', err)
  }
}

// 画像一覧を読み込み
const loadImages = async (outfit: CharacterOutfitRecord) => {
  try {
    images.value = await getOutfitAllExpressions(props.character.id, outfit.id)
  } catch (err) {
    console.error('画像一覧の読み込みに失敗:', err)
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
  if (!confirm(`「${image.expression}」の画像を削除しますか？`)) {
    return
  }

  try {
    const success = await deleteImageFromDB(image.id)
    if (success) {
      await loadImages(selectedOutfit.value!)
      selectedImages.value.delete(image.id)
    }
  } catch (err) {
    console.error('画像の削除に失敗:', err)
  }
}

// 選択した画像を一括削除
const deleteSelectedImages = async () => {
  if (selectedImages.value.size === 0) return

  const selectedCount = selectedImages.value.size
  if (!confirm(`選択した${selectedCount}枚の画像を削除しますか？`)) {
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
    console.error('一括削除に失敗:', err)
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
