<template>
  <div class="bg-background relative min-h-[200px]">
    <div class="grid grid-cols-1 gap-4 sm:gap-3 lg:grid-cols-2">
      <HistoryItem
        v-for="chat in chats"
        :key="chat.id"
        :chat="chat"
        :batch-mode="batchMode"
        :selected="selectedChats.has(chat.id)"
        @select-chat="$emit('select-chat', $event)"
        @edit-title="$emit('edit-title', $event)"
        @toggle-archive="$emit('toggle-archive', $event)"
        @delete-chat="$emit('delete-chat', $event)"
        @export-chat="$emit('export-chat', $event)"
        @toggle-selection="$emit('toggle-selection', $event)"
      />
    </div>

    <div
      v-if="chats.length === 0"
      class="flex flex-col items-center justify-center px-8 py-16 text-center"
    >
      <div class="mb-6 opacity-60">
        <Icon
          icon="material-symbols:chat-bubble-outline"
          class="text-muted-foreground h-16 w-16"
        />
      </div>
      <h3 class="text-foreground mb-2 text-xl font-semibold">チャット履歴がありません</h3>
      <p class="text-muted-foreground text-sm">新しいチャットを作成してください</p>
    </div>

    <div
      v-if="loading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--background)_85%,transparent)] backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="border-border border-t-primary h-8 w-8 animate-spin rounded-full border-2"></div>
        <span class="text-muted-foreground text-sm">読み込み中...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { ChatSession } from '~/types/chat'
import HistoryItem from './HistoryItem.vue'

interface Props {
  chats: ChatSession[]
  loading?: boolean
  batchMode?: boolean
  selectedChats?: Set<string>
}

withDefaults(defineProps<Props>(), {
  loading: false,
  batchMode: false,
  selectedChats: () => new Set(),
})

interface Emits {
  (e: 'select-chat' | 'edit-title' | 'toggle-archive' | 'delete-chat' | 'export-chat', chat: ChatSession): void
  (e: 'toggle-selection', chatId: string): void
}

defineEmits<Emits>()
</script>

<style scoped>
/* アニメーション - CSS @keyframesでしか実現できない部分のみ残す */
.grid > * {
  animation: fadeInUp 0.3s ease-out;
}

.grid > *:nth-child(2n) {
  animation-delay: 0.1s;
}

.grid > *:nth-child(3n) {
  animation-delay: 0.2s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
