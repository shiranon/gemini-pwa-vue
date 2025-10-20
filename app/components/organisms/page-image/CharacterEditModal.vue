<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>キャラクターを編集</DialogTitle>
      </DialogHeader>

      <!-- 編集フォーム -->
      <form
        class="space-y-4"
        @submit.prevent="handleUpdate"
      >
        <div>
          <label class="text-sm font-medium">キャラクター名</label>
          <Input
            v-model="editForm.name"
            placeholder="キャラクター名を入力"
            class="mt-1"
            :disabled="isUpdating"
          />
        </div>

        <div>
          <label class="text-sm font-medium">説明（任意）</label>
          <textarea
            v-model="editForm.description"
            placeholder="キャラクターの説明を入力"
            class="border-border bg-background text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:ring-ring mt-1 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isUpdating"
          />
        </div>

        <!-- ボタン -->
        <div class="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            :disabled="isUpdating"
            @click="$emit('close')"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
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
import { useCharacterImages } from '~/composables/useCharacterImages'
import { logger } from '~/lib/logger'
import type { CharacterRecord } from '~/types/database'

interface Props {
  character: CharacterRecord
}

interface Emits {
  close: []
  updated: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updateCharacter } = useCharacterImages()

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
  () => props.character,
  (newCharacter) => {
    if (newCharacter) {
      editForm.value = {
        name: newCharacter.name,
        description: newCharacter.description || '',
      }
    }
  },
  { immediate: true }
)

// キャラクターを更新
const handleUpdate = async () => {
  if (!editForm.value.name.trim()) return

  try {
    isUpdating.value = true
    const success = await updateCharacter(props.character.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
    })

    if (success) {
      emit('updated')
    }
  } catch (err) {
    logger.error('キャラクターの更新に失敗', { component: 'CharacterEditModal' }, err)
  } finally {
    isUpdating.value = false
  }
}

// Dialogの開閉を監視
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('close')
  }
})
</script>
