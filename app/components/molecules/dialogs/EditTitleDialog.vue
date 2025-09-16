<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>タイトルを編集</DialogTitle>
        <DialogDescription> チャットの新しいタイトルを入力してください。 </DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <Input
          ref="titleInput"
          v-model="title"
          placeholder="新しいタイトル"
          @keydown.enter="handleSave"
        />
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleCancel"
        >
          キャンセル
        </Button>
        <Button
          :disabled="!title.trim()"
          @click="handleSave"
        >
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

interface EditTitleDialogProps {
  initialTitle?: string
  modelValue?: boolean
}

interface EditTitleDialogEmits {
  save: [title: string]
  cancel: []
  'update:modelValue': [value: boolean]
}

const props = withDefaults(defineProps<EditTitleDialogProps>(), {
  initialTitle: '',
  modelValue: false,
})

const emit = defineEmits<EditTitleDialogEmits>()

const titleInput: Ref<InstanceType<typeof Input> | null> = ref(null)
const title = ref('')
const isOpen = ref(false)

watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
  }
)

watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
})

watch(isOpen, (newValue) => {
  if (newValue) {
    title.value = props.initialTitle
    nextTick(() => {
      titleInput.value?.$el?.focus?.()
    })
  }
})

const handleSave = () => {
  if (title.value.trim()) {
    emit('save', title.value.trim())
    isOpen.value = false
    title.value = ''
  }
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
  title.value = ''
}
</script>
