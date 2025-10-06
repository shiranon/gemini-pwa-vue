<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>衣装を編集</DialogTitle>
      </DialogHeader>

      <!-- 編集フォーム -->
      <form
        class="space-y-4"
        @submit.prevent="handleUpdate"
      >
        <div>
          <label class="text-sm font-medium">衣装名</label>
          <Input
            v-model="editForm.name"
            placeholder="衣装名を入力"
            class="mt-1"
            :disabled="isUpdating"
          />
        </div>

        <div>
          <label class="text-sm font-medium">説明（任意）</label>
          <Textarea
            v-model="editForm.description"
            placeholder="衣装の説明を入力"
            class="mt-1 min-h-[80px]"
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
import { Textarea } from '~/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { logger } from '~/utils/logger'
import type { CharacterOutfitRecord } from '~/types/database'

interface Props {
  outfit: CharacterOutfitRecord
}

interface Emits {
  close: []
  updated: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updateOutfit } = useCharacterImages()

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
  () => props.outfit,
  (newOutfit) => {
    if (newOutfit) {
      editForm.value = {
        name: newOutfit.name,
        description: newOutfit.description || '',
      }
    }
  },
  { immediate: true }
)

// 衣装を更新
const handleUpdate = async () => {
  if (!editForm.value.name.trim()) return

  try {
    isUpdating.value = true
    const success = await updateOutfit(props.outfit.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
    })

    if (success) {
      emit('updated')
    }
  } catch (err) {
    logger.error('衣装の更新に失敗', { component: 'OutfitEditModal' }, err)
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
