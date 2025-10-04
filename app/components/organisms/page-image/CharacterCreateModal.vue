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
            作成
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { useCharacterImages } from '~/composables/useCharacterImages'
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

const { createCharacter } = useCharacterImages()

// Dialogの開閉状態
const isOpen = ref(props.open)

// 状態管理
const isCreating = ref(false)
const form = ref({
  name: '',
  description: '',
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
    }
  }
)

// Dialogの開閉を監視
watch(isOpen, (newValue) => {
  emit('update:open', newValue)
})

// キャラクターを作成
const handleCreate = async () => {
  if (!form.value.name.trim()) return

  try {
    isCreating.value = true
    const newCharacter = await createCharacter(form.value.name.trim(), form.value.description.trim() || undefined)

    if (newCharacter) {
      emit('created', newCharacter)
      isOpen.value = false
    }
  } catch (err) {
    console.error('キャラクターの作成に失敗:', err)
  } finally {
    isCreating.value = false
  }
}

// キャンセル処理
const handleCancel = () => {
  isOpen.value = false
}
</script>
