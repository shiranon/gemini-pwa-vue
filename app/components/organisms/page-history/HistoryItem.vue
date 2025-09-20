<template>
  <div class="border-border bg-card text-card-foreground hover:border-primary/40 rounded-lg border transition-all duration-200 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] hover:shadow-lg">
    <div :class="['flex h-full items-stretch', chat.isArchived && 'bg-muted opacity-70', batchMode && 'flex-row items-start gap-3 p-3', selected && 'border-primary bg-primary/10 border']">
      <div
        v-if="batchMode"
        class="flex flex-shrink-0 items-start pt-4"
      >
        <input
          :id="`chat-${chat.id}`"
          v-model="isSelected"
          type="checkbox"
          class="border-border text-primary focus:ring-primary h-4 w-4 rounded"
          @change="handleSelectionChange"
        />
      </div>

      <div
        :class="['flex-1 transition-colors duration-200', batchMode ? 'p-0' : 'hover:bg-muted cursor-pointer p-4']"
        @click="handleChatClick"
      >
        <div class="mb-2 flex items-start justify-between gap-3 sm:flex-col sm:gap-2">
          <h3 class="text-foreground flex-1 text-lg leading-tight font-semibold break-words">{{ chat.title }}</h3>
          <div class="flex flex-shrink-0 flex-wrap gap-2 sm:self-start">
            <span
              v-if="chat.isArchived"
              class="bg-accent text-accent-foreground rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap"
              >アーカイブ</span
            >
            <span class="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap">{{ messageCount }}件</span>
          </div>
        </div>

        <div class="mt-2">
          <div class="text-muted-foreground mb-2 flex gap-4 text-sm sm:flex-col sm:gap-1">
            <span> 作成: {{ formatDate(chat.createdAt) }} </span>
            <span> 更新: {{ formatDate(chat.updatedAt) }} </span>
          </div>

          <div
            v-if="latestMessage"
            class="text-muted-foreground text-sm leading-relaxed"
          >
            <span class="text-foreground font-medium"> {{ latestMessage.role === 'user' ? 'あなた' : 'アシスタント' }}: </span>
            <span class="ml-1">{{ truncateMessage(latestMessage.content) }}</span>
          </div>
        </div>
      </div>

      <HistoryItemActions
        :chat="chat"
        :batch-mode="batchMode"
        @select-chat="$emit('select-chat', chat)"
        @edit-title="$emit('edit-title', chat)"
        @toggle-archive="$emit('toggle-archive', chat)"
        @export-chat="$emit('export-chat', chat)"
        @delete-chat="$emit('delete-chat', chat)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatSession } from '~/types/chat'
import { formatDate, truncateMessage } from '~/lib/format'
import HistoryItemActions from '~/components/molecules/page-history/HistoryItemActions.vue'

interface Props {
  chat: ChatSession
  batchMode?: boolean
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  batchMode: false,
  selected: false,
})

interface Emits {
  (e: 'select-chat' | 'edit-title' | 'toggle-archive' | 'delete-chat' | 'export-chat', chat: ChatSession): void
  (e: 'toggle-selection', chatId: string): void
}

const emit = defineEmits<Emits>()

const messageCount = computed(() => props.chat.messages.length)

const latestMessage = computed(() => {
  const messages = props.chat.messages
  return messages.length > 0 ? messages[messages.length - 1] : null
})

const isSelected = computed({
  get: () => props.selected,
  set: (value: boolean) => {
    if (value !== props.selected) {
      emit('toggle-selection', props.chat.id)
    }
  },
})

const handleChatClick = () => {
  if (!props.batchMode) {
    emit('select-chat', props.chat)
  } else {
    emit('toggle-selection', props.chat.id)
  }
}

const handleSelectionChange = () => {
  emit('toggle-selection', props.chat.id)
}
</script>
