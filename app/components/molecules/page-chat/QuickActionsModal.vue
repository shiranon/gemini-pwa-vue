<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button
        :disabled="disabled"
        class="p-0"
      >
        <Icon icon="icon-park-solid:scan-setting" />
      </Button>
    </DialogTrigger>
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>クイックアクション</DialogTitle>
      </DialogHeader>
      <div class="grid grid-cols-4 gap-3 p-4">
        <QuickActionButton
          v-for="action in quickActions"
          :key="action.id"
          :icon="action.icon"
          :label="action.label"
          :enabled="action.enabled"
          :description="action.description"
          @toggle="handleToggle(action.id)"
        />
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          @click="isOpen = false"
        >
          閉じる
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import QuickActionButton from './QuickActionButton.vue'
import { useQuickActions } from '~/composables/useQuickActions'

interface Props {
  disabled?: boolean
  buttonLabel?: string
  canSummarize?: boolean
  isSummarizing?: boolean
}

const _props = withDefaults(defineProps<Props>(), {
  disabled: false,
  buttonLabel: 'アクション',
  canSummarize: false,
  isSummarizing: false,
})

const _emit = defineEmits<{
  summarize: []
}>()

const isOpen = ref(false)
const { quickActions, toggleAction } = useQuickActions()

const handleToggle = (actionId: string) => {
  toggleAction(actionId)
}
</script>
