<template>
  <div class="border-border bg-card text-card-foreground min-h-[400px] rounded-lg border p-6 shadow-sm">
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <Icon
        icon="material-symbols:progress-activity"
        class="text-primary mr-2 h-8 w-8 animate-spin"
      />
      <span class="text-muted-foreground">読み込み中...</span>
    </div>

    <div
      v-else-if="error"
      class="py-12 text-center"
    >
      <div class="text-destructive mb-4">
        <Icon
          icon="material-symbols:warning"
          class="mx-auto h-16 w-16"
        />
      </div>
      <p class="text-muted-foreground mb-4">{{ error }}</p>
      <Button
        variant="default"
        @click="$emit('refresh')"
      >
        再読み込み
      </Button>
    </div>

    <div
      v-else-if="isEmpty"
      class="py-12 text-center"
    >
      <div class="text-muted-foreground mb-4">
        <Icon
          icon="material-symbols:chat-bubble-outline"
          class="mx-auto h-16 w-16"
        />
      </div>
      <p class="text-muted-foreground mb-4">
        {{ emptyMessage }}
      </p>
      <Button
        variant="default"
        @click="$emit('create-new-chat')"
      >
        {{ emptyActionText }}
      </Button>
    </div>

    <div v-else>
      <slot />

      <div
        v-if="totalPages > 1"
        class="mt-8"
      >
        <PaginationControls
          :current-page="currentPage"
          :total-pages="totalPages"
          @update:current-page="$emit('update:currentPage', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import PaginationControls from '~/components/molecules/page-history/PaginationControls.vue'

export interface HistoryContentProps {
  loading?: boolean
  error?: string | null
  isEmpty?: boolean
  searchQuery?: string
  currentPage?: number
  totalPages?: number
}

const props = withDefaults(defineProps<HistoryContentProps>(), {
  loading: false,
  error: null,
  isEmpty: false,
  searchQuery: '',
  currentPage: 1,
  totalPages: 1,
})

defineEmits<{
  refresh: []
  'create-new-chat': []
  'update:currentPage': [page: number]
}>()

const emptyMessage = computed(() => {
  return props.searchQuery ? '検索結果が見つかりませんでした' : 'チャット履歴がありません'
})

const emptyActionText = computed(() => {
  return props.searchQuery ? '新規チャットを作成' : '最初のチャットを作成'
})
</script>
