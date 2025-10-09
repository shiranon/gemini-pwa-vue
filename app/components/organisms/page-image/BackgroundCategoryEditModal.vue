<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="mx-4 max-w-md">
      <DialogHeader>
        <DialogTitle>カテゴリーを編集</DialogTitle>
      </DialogHeader>

      <!-- 編集フォーム -->
      <form
        class="space-y-4"
        @submit.prevent="handleUpdate"
      >
        <div>
          <label class="text-sm font-medium">カテゴリー名</label>
          <Input
            v-model="editForm.name"
            placeholder="カテゴリー名を入力"
            class="mt-1"
            :disabled="isUpdating"
          />
        </div>

        <div>
          <label class="text-sm font-medium">説明（任意）</label>
          <textarea
            v-model="editForm.description"
            placeholder="カテゴリーの説明を入力"
            class="border-border bg-background text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:ring-ring mt-1 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isUpdating"
          />
        </div>

        <!-- ボタン -->
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            class="w-full sm:w-auto"
            :disabled="isUpdating"
            @click="$emit('close')"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            class="w-full sm:w-auto"
            :disabled="!editForm.name.trim() || isUpdating"
          >
            <Icon
              v-if="isUpdating"
              icon="material-symbols:loading"
              class="mr-2 h-4 w-4 animate-spin"
            />
            <Icon
              v-else
              icon="material-symbols:save"
              class="mr-2 h-4 w-4"
            />
            保存
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { useBackgroundImages } from '~/composables/useBackgroundImages'
import { logger } from '~/utils/logger'
import type { BackgroundCategoryRecord } from '~/types/database'

interface Props {
  category: BackgroundCategoryRecord
}

interface Emits {
  close: []
  updated: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updateCategory } = useBackgroundImages()

// Dialogの開閉状態
const isOpen = ref(true)

// 状態管理
const isUpdating = ref(false)
const editForm = ref({
  name: '',
  description: '',
})

// プロパティの変更を監視してフォームを更新
watch(
  () => props.category,
  (newCategory) => {
    editForm.value = {
      name: newCategory.name,
      description: newCategory.description || '',
    }
  },
  { immediate: true }
)

// ダイアログが閉じられた時にcloseイベントを発火
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('close')
  }
})

// カテゴリーを更新
const handleUpdate = async () => {
  try {
    isUpdating.value = true

    const result = await updateCategory(props.category.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description?.trim() || undefined,
    })

    if (result) {
      emit('updated')
      isOpen.value = false
    }
  } catch (error) {
    logger.error('カテゴリー更新エラー', { component: 'BackgroundCategoryEditModal' }, error)
  } finally {
    isUpdating.value = false
  }
}
</script>
