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
            <div class="text-muted-foreground">{{ selectedFolder.characterName }}</div>
            <div class="mt-1 text-xs">{{ selectedFolder.outfits.length }}個の衣装、{{ totalImages }}枚の画像</div>
          </div>
          <div
            v-if="!folderUpload.isSupported"
            class="text-muted-foreground text-xs"
          >
            このブラウザはフォルダ選択をサポートしていません
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
            :disabled="!form.name.trim() || isCreating"
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
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { useFolderUpload, type FolderStructure } from '~/composables/useFolderUpload'
import { logger } from '~/utils/logger'
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

const { createCharacter, bulkUploadFromFolder } = useCharacterImages()
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
const form = ref({
  name: '',
  description: '',
})

// 計算プロパティ
const totalImages = computed(() => {
  if (!selectedFolder.value) return 0
  return selectedFolder.value.outfits.reduce((sum, outfit) => sum + outfit.images.length, 0)
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

// 選択されたフォルダをクリア
const clearSelectedFolder = () => {
  selectedFolder.value = null
}

// キャラクターを作成
const handleCreate = async () => {
  if (!form.value.name.trim()) return

  try {
    isCreating.value = true

    if (selectedFolder.value) {
      // フォルダから一括作成
      const result = await bulkUploadFromFolder(selectedFolder.value, form.value.description.trim() || undefined)

      if (result.character) {
        emit('created', result.character)
        isOpen.value = false

        // 結果をログに記録
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
