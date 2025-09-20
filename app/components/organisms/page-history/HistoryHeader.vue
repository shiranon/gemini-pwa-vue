<template>
  <div class="border-border bg-card text-card-foreground my-3 rounded-lg border p-6 shadow-sm sm:px-6 sm:pt-6">
    <h1 class="text-foreground mb-4 text-xl font-bold sm:text-2xl">チャット履歴</h1>

    <div class="mb-4 space-y-2">
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div class="flex-1 sm:flex-none">
            <HistorySearch
              :search-query="searchQuery"
              @update:search-query="$emit('update:searchQuery', $event)"
            />
          </div>

          <SortSelect
            :sort-order="sortOrder"
            @update:sort-order="$emit('update:sortOrder', $event)"
          />
          <div class="hidden w-full justify-end sm:flex">
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="$emit('import-chats')"
              >
                <Icon icon="material-symbols:upload" />
                <span class="sm:inline">インポート</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                @click="$emit('create-new-chat')"
              >
                <Icon icon="gridicons:add" />
                <span class="sm:inline">新規チャット</span>
              </Button>
            </div>
          </div>
        </div>

        <div class="block flex-none sm:hidden">
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-10 flex-1"
              @click="$emit('import-chats')"
            >
              <Icon icon="material-symbols:upload" />
              <span>インポート</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              class="h-10 flex-1"
              @click="$emit('create-new-chat')"
            >
              <Icon icon="gridicons:add" />
              <span>新規チャット</span>
            </Button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row">
        <HistoryFilters
          :show-archived="showArchived"
          @update:show-archived="$emit('update:showArchived', $event)"
        />

        <div class="flex w-full items-center justify-end gap-2">
          <Button
            :variant="!batchMode ? 'outline' : 'destructive'"
            size="sm"
            @click="$emit('toggle-batch-mode')"
          >
            <template #icon>
              <Icon icon="material-symbols:check-circle-outline" />
            </template>
            複数選択
          </Button>

          <HistoryStats :stats="stats" />
        </div>
      </div>
    </div>

    <div
      v-if="batchMode"
      class="mt-4"
    >
      <BatchControls
        :select-all-checked="selectAllChecked"
        :selected-count="selectedCount"
        :total-count="totalCount"
        @select-all="$emit('select-all', $event)"
        @batch-export="$emit('batch-export')"
        @batch-archive="$emit('batch-archive')"
        @batch-delete="$emit('batch-delete')"
        @cancel="$emit('toggle-batch-mode')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import HistorySearch from '~/components/molecules/page-history/HistorySearch.vue'
import HistoryFilters from '~/components/molecules/page-history/HistoryFilters.vue'
import BatchControls from '~/components/molecules/page-history/BatchControls.vue'
import HistoryStats from '~/components/molecules/page-history/HistoryStats.vue'
import SortSelect, { type SortOrderType } from '~/components/molecules/page-history/SortSelect.vue'

export interface HistoryHeaderProps {
  searchQuery?: string
  sortOrder?: SortOrderType
  showArchived?: boolean | null
  batchMode?: boolean
  selectAllChecked?: boolean
  selectedCount?: number
  totalCount?: number
  stats?: {
    totalChats: number
    totalMessages: number
  } | null
}

defineProps<HistoryHeaderProps>()

defineEmits<{
  'update:searchQuery': [query: string]
  'update:sortOrder': [sortOrder: SortOrderType]
  'update:showArchived': [value: boolean | null]
  'toggle-batch-mode': []
  'create-new-chat': []
  'import-chats': []
  'select-all': [checked: boolean]
  'batch-export': []
  'batch-archive': []
  'batch-delete': []
}>()
</script>
