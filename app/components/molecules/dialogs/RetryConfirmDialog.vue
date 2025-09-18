<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>メッセージの再送信</DialogTitle>
        <DialogDescription>選択したメッセージ以降の{{ messageCount }}件のメッセージが削除され、やり直しされます。</DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <div class="bg-muted rounded-lg p-3 text-sm">
          <p class="text-muted-foreground mb-2">
            <strong>影響範囲:</strong>
          </p>
          <ul class="text-muted-foreground space-y-1 text-xs">
            <li v-if="targetMessage">• 選択したメッセージ: "{{ truncatedContent }}"</li>
            <li>• 削除されるメッセージ数: {{ messageCount }}件</li>
            <li>• 再送信するメッセージ: "{{ truncatedResendContent }}"</li>
          </ul>
        </div>
        <p class="text-destructive mt-3 text-xs">⚠️ この操作は取り消すことができません</p>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleCancel"
        >
          キャンセル
        </Button>
        <Button
          variant="destructive"
          @click="handleConfirm"
        >
          実行する
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import type { Message } from '~/types/chat'

interface RetryConfirmDialogProps {
  modelValue?: boolean
  targetMessage?: Message | null
  messageCount?: number
  resendMessage?: Message | null
}

interface RetryConfirmDialogEmits {
  confirm: []
  cancel: []
  'update:modelValue': [value: boolean]
}

const props = withDefaults(defineProps<RetryConfirmDialogProps>(), {
  modelValue: false,
  targetMessage: null,
  messageCount: 0,
  resendMessage: null,
})

const emit = defineEmits<RetryConfirmDialogEmits>()

const isOpen = ref(false)

const truncatedContent = computed(() => {
  if (!props.targetMessage?.content) return ''
  const content = props.targetMessage.content.trim()
  return content.length > 50 ? content.substring(0, 50) + '...' : content
})

const truncatedResendContent = computed(() => {
  if (!props.resendMessage?.content) return ''
  const content = props.resendMessage.content.trim()
  return content.length > 50 ? content.substring(0, 50) + '...' : content
})

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
