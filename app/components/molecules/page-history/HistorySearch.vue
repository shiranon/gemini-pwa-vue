<template>
  <div class="relative">
    <div class="relative">
      <Input
        :model-value="searchQuery"
        type="search"
        placeholder="チャットを検索..."
        class="w-64 pr-10"
        @update:model-value="handleSearch"
      />
      <Icon
        icon="material-symbols:search"
        class="text-muted-foreground absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Input } from '~/components/ui/input'

export interface HistorySearchProps {
  searchQuery?: string
}

withDefaults(defineProps<HistorySearchProps>(), {
  searchQuery: '',
})

const emit = defineEmits<{
  'update:searchQuery': [query: string]
}>()

const handleSearch = (query: string | number) => {
  emit('update:searchQuery', String(query))
}
</script>
