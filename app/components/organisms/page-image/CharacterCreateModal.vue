<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="mx-4 max-w-md">
      <DialogHeader>
        <DialogTitle>新しいキャラクターを作成</DialogTitle>
        <DialogDescription>キャラクターの基本情報を入力してください</DialogDescription>
      </DialogHeader>

      <!-- 作成フォーム -->
      <form
        class="space-y-4"
        @submit.prevent="handleCreate"
      >
        <!-- 一括登録モードではキャラクター名・説明を非表示 -->
        <template v-if="!selectedMultiFolder">
          <div>
            <label class="text-sm font-medium">キャラクター名</label>
            <Input
              v-model="form.name"
              placeholder="キャラクター名を入力"
              class="mt-1"
              :disabled="isCreating"
            />
          </div>

          <div>
            <label class="text-sm font-medium">説明（任意）</label>
            <textarea
              v-model="form.description"
              placeholder="キャラクターの説明を入力"
              class="border-border bg-background text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:ring-ring mt-1 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isCreating"
            />
          </div>
        </template>

        <!-- フォルダ選択オプション -->
        <div class="space-y-2">
          <label class="text-sm font-medium">画像を一括登録（オプション）</label>
          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              class="flex-1"
              :disabled="isCreating || !folderUpload.isSupported || !!selectedMultiFolder"
              @click="handleSelectFolder"
            >
              <Icon
                icon="material-symbols:folder-open"
                class="mr-2 h-4 w-4"
              />
              フォルダを選択
            </Button>
            <Button
              type="button"
              variant="outline"
              class="flex-1"
              :disabled="isCreating || !folderUpload.isSupported || !!selectedFolder"
              @click="handleSelectMultiFolder"
            >
              <Icon
                icon="material-symbols:create-new-folder"
                class="mr-2 h-4 w-4"
              />
              一括登録
            </Button>
            <Button
              v-if="selectedFolder || selectedMultiFolder"
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
          <!-- 単一キャラクターフォルダ選択時のプレビュー -->
          <div
            v-if="selectedFolder"
            class="bg-muted rounded-md p-3 text-sm"
          >
            <div class="font-medium">選択されたフォルダ:</div>
            <div class="text-muted-foreground">{{ selectedFolder.characterName }}</div>
            <div class="mt-1 text-xs">{{ selectedFolder.outfits.length }}個の衣装、{{ totalImages }}枚の画像</div>
          </div>
          <!-- 複数キャラクター一括登録時のプレビュー -->
          <div
            v-if="selectedMultiFolder"
            class="bg-muted rounded-md p-3 text-sm"
          >
            <div class="font-medium">一括登録プレビュー:</div>
            <div class="text-muted-foreground mt-1">{{ selectedMultiFolder.length }}キャラクター、{{ multiTotalOutfits }}個の衣装、{{ multiTotalImages }}枚の画像</div>
            <div class="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
              <div
                v-for="structure in selectedMultiFolder"
                :key="structure.characterName"
                class="text-muted-foreground"
              >
                {{ structure.characterName }} ({{ structure.outfits.length }}衣装、{{ structure.outfits.reduce((sum, o) => sum + o.images.length, 0) }}画像)
              </div>
            </div>
          </div>
          <div
            v-if="!folderUpload.isSupported"
            class="text-muted-foreground text-xs"
          >
            このブラウザはフォルダ選択をサポートしていません
          </div>
        </div>

        <!-- アップロード進捗 -->
        <div
          v-if="isCreating && uploadTotal > 0"
          class="space-y-2"
        >
          <div class="text-sm font-medium">アップロード中... {{ uploadCurrent }} / {{ uploadTotal }}</div>
          <div class="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              class="bg-primary h-full rounded-full transition-all duration-300"
              :style="{ width: `${uploadPercent}%` }"
            />
          </div>
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
            :disabled="isCreateDisabled"
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
            {{ createButtonLabel }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { useFolderUpload, type FolderStructure } from '~/composables/useFolderUpload'
import { logger } from '~/lib/logger'
import type { CharacterRecord } from '~/types/database'

interface Props {
  open: boolean
}

interface Emits {
  'update:open': [value: boolean]
  created: [character: CharacterRecord]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createCharacter, bulkUploadFromFolder, bulkUploadMultipleCharacters } = useCharacterImages()
const folderUpload = useFolderUpload()

// フォルダ選択サポートの確認
onMounted(() => {
  folderUpload.checkSupport()
})

// Dialogの開閉状態
const isOpen = ref(props.open)

// 状態管理
const isCreating = ref(false)
const selectedFolder = ref<FolderStructure | null>(null)
const selectedMultiFolder = ref<FolderStructure[] | null>(null)
const uploadCurrent = ref(0)
const uploadTotal = ref(0)
const form = ref({
  name: '',
  description: '',
})

// 計算プロパティ
const totalImages = computed(() => {
  if (!selectedFolder.value) return 0
  return selectedFolder.value.outfits.reduce((sum, outfit) => sum + outfit.images.length, 0)
})

const multiTotalOutfits = computed(() => {
  if (!selectedMultiFolder.value) return 0
  return selectedMultiFolder.value.reduce((sum, s) => sum + s.outfits.length, 0)
})

const multiTotalImages = computed(() => {
  if (!selectedMultiFolder.value) return 0
  return selectedMultiFolder.value.reduce((sum, s) => sum + s.outfits.reduce((oSum, o) => oSum + o.images.length, 0), 0)
})

const isCreateDisabled = computed(() => {
  if (isCreating.value) return true
  if (selectedMultiFolder.value) return false
  return !form.value.name.trim()
})

const uploadPercent = computed(() => {
  if (uploadTotal.value === 0) return 0
  return Math.round((uploadCurrent.value / uploadTotal.value) * 100)
})

const createButtonLabel = computed(() => {
  if (selectedMultiFolder.value) return `${selectedMultiFolder.value.length}キャラクターを一括登録`
  if (selectedFolder.value) return '作成して画像を登録'
  return '作成'
})

// プロパティの変更を監視
watch(
  () => props.open,
  (newValue) => {
    isOpen.value = newValue
    if (newValue) {
      // モーダルが開かれた時にフォームをリセット
      form.value = {
        name: '',
        description: '',
      }
      selectedFolder.value = null
      selectedMultiFolder.value = null
    }
  }
)

// Dialogの開閉を監視
watch(isOpen, (newValue) => {
  emit('update:open', newValue)
})

// フォルダを選択
const handleSelectFolder = async () => {
  try {
    const folderStructure = await folderUpload.selectFolder()
    if (folderStructure) {
      selectedFolder.value = folderStructure
      // フォルダ名をキャラクター名に自動設定
      if (!form.value.name.trim()) {
        form.value.name = folderStructure.characterName
      }
    }
  } catch (error) {
    logger.error('フォルダ選択に失敗', { component: 'CharacterCreateModal' }, error)
  }
}

// 複数キャラクターフォルダを選択
const handleSelectMultiFolder = async () => {
  try {
    const structures = await folderUpload.selectMultiCharacterFolder()
    if (structures) {
      selectedMultiFolder.value = structures
      selectedFolder.value = null
    }
  } catch (error) {
    logger.error('複数キャラクターフォルダ選択に失敗', { component: 'CharacterCreateModal' }, error)
  }
}

// 選択されたフォルダをクリア
const clearSelectedFolder = () => {
  selectedFolder.value = null
  selectedMultiFolder.value = null
}

// キャラクターを作成
const handleCreate = async () => {
  if (!selectedMultiFolder.value && !form.value.name.trim()) return

  const handleProgress = (current: number, total: number) => {
    uploadCurrent.value = current
    uploadTotal.value = total
  }

  try {
    isCreating.value = true
    uploadCurrent.value = 0
    uploadTotal.value = 0

    if (selectedMultiFolder.value) {
      // 複数キャラクター一括登録
      uploadTotal.value = selectedMultiFolder.value.reduce((sum, s) => sum + s.outfits.reduce((oSum, o) => oSum + o.images.length, 0), 0)
      const result = await bulkUploadMultipleCharacters(selectedMultiFolder.value, handleProgress)

      const firstCharacter = result.characters[0]
      if (firstCharacter) {
        emit('created', firstCharacter)
        isOpen.value = false

        if (result.errors.length > 0) {
          logger.warn(`一括登録完了: ${result.characters.length}キャラクター、成功${result.totalSuccess}件、失敗${result.totalFailed}件`, { component: 'CharacterCreateModal' })
        } else {
          logger.info(`一括登録完了: ${result.characters.length}キャラクター、成功${result.totalSuccess}件`, { component: 'CharacterCreateModal' })
        }
      }
    } else if (selectedFolder.value) {
      // フォルダから一括作成
      uploadTotal.value = selectedFolder.value.outfits.reduce((sum, o) => sum + o.images.length, 0)
      const result = await bulkUploadFromFolder(selectedFolder.value, form.value.description.trim() || undefined, handleProgress)

      if (result.character) {
        emit('created', result.character)
        isOpen.value = false

        if (result.errors.length > 0) {
          logger.warn(`一括アップロード完了: 成功${result.success}件、失敗${result.failed}件`, { component: 'CharacterCreateModal' })
          logger.warn('アップロードエラー:', { component: 'CharacterCreateModal' }, result.errors)
        } else {
          logger.info(`一括アップロード完了: 成功${result.success}件`, { component: 'CharacterCreateModal' })
        }
      }
    } else {
      // 通常の作成
      const newCharacter = await createCharacter(form.value.name.trim(), form.value.description.trim() || undefined)

      if (newCharacter) {
        emit('created', newCharacter)
        isOpen.value = false
      }
    }
  } catch (err) {
    logger.error('キャラクターの作成に失敗', { component: 'CharacterCreateModal' }, err)
  } finally {
    isCreating.value = false
  }
}

// キャンセル処理
const handleCancel = () => {
  isOpen.value = false
}
</script>
