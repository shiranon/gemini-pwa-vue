<template>
  <div class="border-border bg-card text-card-foreground mb-6 rounded-lg border p-6 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-foreground text-2xl font-bold">チャット履歴</h1>

      <div class="flex items-center gap-2">
        <Button
          v-if="!batchMode"
          variant="ghost"
          size="sm"
          @click="$emit('toggle-batch-mode')"
        >
          <template #icon>
            <Icon icon="material-symbols:check-circle-outline" />
          </template>
          選択
        </Button>

        <HistorySearch
          :search-query="searchQuery"
          @update:search-query="$emit('update:searchQuery', $event)"
        />

        <SortSelect
          :sort-order="sortOrder"
          @update:sort-order="$emit('update:sortOrder', $event)"
        />

        <Button
          variant="default"
          size="sm"
          @click="$emit('create-new-chat')"
        >
          <template #icon>
            <Icon icon="material-symbols:add" />
          </template>
          新規チャット
        </Button>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <HistoryFilters
        :show-archived="showArchived"
        @update:show-archived="$emit('update:showArchived', $event)"
      />

      <HistoryStats :stats="stats" />
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
  'select-all': [checked: boolean]
  'batch-export': []
  'batch-archive': []
  'batch-delete': []
}>()
</script>
