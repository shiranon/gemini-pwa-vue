<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title || 'お知らせ' }}</DialogTitle>
        <DialogDescription>
          {{ description || message || 'お知らせがあります' }}
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="message && description"
        class="py-4"
      >
        <p class="text-sm">
          {{ message }}
        </p>
      </div>

      <DialogFooter>
        <Button @click="handleOk">
          {{ okText || 'OK' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

interface AlertDialogProps {
  title?: string
  description?: string
  message: string
  okText?: string
  modelValue?: boolean
}

interface AlertDialogEmits {
  ok: []
  'update:modelValue': [value: boolean]
}

const props = withDefaults(defineProps<AlertDialogProps>(), {
  title: '',
  okText: 'OK',
  modelValue: false,
})

const emit = defineEmits<AlertDialogEmits>()

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

const handleOk = () => {
  emit('ok')
  isOpen.value = false
}
</script>
