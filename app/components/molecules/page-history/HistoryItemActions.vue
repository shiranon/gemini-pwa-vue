<template>
  <div :class="['border-border bg-muted flex flex-col border-l', batchMode && 'hidden']">
    <div class="flex flex-col gap-px sm:flex-1 sm:flex-row">
      <Button
        variant="ghost"
        size="sm"
        class="text-primary hover:text-primary gap-2 sm:flex-1 sm:justify-center"
        title="チャットを開く"
        @click="$emit('select-chat')"
      >
        <Icon icon="material-symbols:chat" />
        <span>開く</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="gap-2 sm:flex-1 sm:justify-center"
        title="タイトルを編集"
        @click="$emit('edit-title')"
      >
        <Icon icon="material-symbols:edit" />
        <span>編集</span>
      </Button>
    </div>

    <HistoryItemDropdown
      :chat="chat"
      @toggle-archive="$emit('toggle-archive')"
      @export-chat="$emit('export-chat')"
      @delete-chat="$emit('delete-chat')"
    />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { ChatSession } from '~/types/chat'
import HistoryItemDropdown from './HistoryItemDropdown.vue'

interface Props {
  chat: ChatSession
  batchMode?: boolean
}

defineProps<Props>()

defineEmits<{
  'select-chat': []
  'edit-title': []
  'toggle-archive': []
  'export-chat': []
  'delete-chat': []
}>()
</script>
