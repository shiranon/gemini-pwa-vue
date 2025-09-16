<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title || '確認' }}</DialogTitle>
        <DialogDescription>
          {{ description || message || 'この操作を実行しますか？' }}
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="message && description"
        class="py-4"
      >
        <p class="text-muted-foreground text-sm">
          {{ message }}
        </p>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleCancel"
        >
          {{ cancelText || 'キャンセル' }}
        </Button>
        <Button
          :variant="isDangerous ? 'destructive' : 'default'"
          @click="handleConfirm"
        >
          {{ confirmText || 'OK' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

interface ConfirmDialogProps {
  title?: string
  description?: string
  message?: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  modelValue?: boolean
}

interface ConfirmDialogEmits {
  confirm: []
  cancel: []
  'update:modelValue': [value: boolean]
}

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  title: '',
  description: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'キャンセル',
  isDangerous: false,
  modelValue: false,
})

const emit = defineEmits<ConfirmDialogEmits>()

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

const handleConfirm = () => {
  emit('confirm')
  isOpen.value = false
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>
