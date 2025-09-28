<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger
      as-child
      class="size-10 rounded-md sm:size-13"
    >
      <Button :disabled="disabled">
        <Icon
          icon="icon-park-solid:scan-setting"
          class="size-6 sm:size-8"
        />
      </Button>
    </DialogTrigger>
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>クイック設定</DialogTitle>
        <DialogDescription>ここでの変更は保存されません</DialogDescription>
      </DialogHeader>
      <div class="grid grid-cols-4 gap-2 py-2 sm:gap-3 sm:p-4">
        <QuickSettingButton
          v-for="action in quickActions"
          :key="action.id"
          :icon="action.icon"
          :label="action.label"
          :enabled="action.enabled"
          :description="action.description"
          @toggle="handleToggle(action.id)"
        />
      </div>
      <DialogHeader>
        <DialogTitle>クイックアクション</DialogTitle>
        <DialogDescription class="sr-only"> よく使用するアクションを実行できます。 </DialogDescription>
      </DialogHeader>
      <div class="grid grid-cols-3 gap-2 py-2 sm:gap-3 sm:p-4">
        <QuickActionButton
          v-for="action in executableActions"
          :key="action.id"
          :icon="action.icon"
          :label="action.label"
          :description="action.description"
          :disabled="action.disabled || (action.id === 'summarize' && !props.canSummarize)"
          :loading="action.id === 'summarize' && props.isSummarizing"
          @click="handleActionClick(action.id, onSummarize)"
        />
      </div>

      <!-- モーダル -->
      <FunctionToggleModal ref="functionToggleModalRef" />
      <ProfileSwitchModal ref="profileSwitchModalRef" />

      <DialogFooter>
        <Button
          variant="outline"
          @click="closeModal"
        >
          閉じる
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import QuickSettingButton from './QuickSettingButton.vue'
import QuickActionButton from './QuickActionButton.vue'
import FunctionToggleModal from './FunctionToggleModal.vue'
import ProfileSwitchModal from './ProfileSwitchModal.vue'
import { useQuickActions } from '~/composables/useQuickActions'

interface Props {
  disabled?: boolean
  buttonLabel?: string
  canSummarize?: boolean
  isSummarizing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  buttonLabel: 'アクション',
  canSummarize: false,
  isSummarizing: false,
})

const emit = defineEmits<{
  summarize: []
}>()

// useQuickActionsからモーダル制御機能を含む全ての機能を取得
const { quickActions, executableActions, isOpen, functionToggleModalRef, profileSwitchModalRef, closeModal, handleActionClick, handleToggle } = useQuickActions()

// 要約アクション用のコールバック関数
const onSummarize = () => {
  emit('summarize')
}
</script>
