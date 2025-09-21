<template>
  <div class="flex items-center pt-2">
    <div class="flex">
      <Button
        :variant="showArchived === false ? 'default' : 'outline'"
        size="sm"
        class="rounded-r-none border-r-0"
        @click="handleFilterChange(false)"
      >
        アクティブ
      </Button>
      <Button
        :variant="showArchived === true ? 'default' : 'outline'"
        size="sm"
        class="rounded-none border-r-0"
        @click="handleFilterChange(true)"
      >
        アーカイブ
      </Button>
      <Button
        :variant="showArchived === null ? 'default' : 'outline'"
        size="sm"
        class="rounded-l-none"
        @click="handleFilterChange(null)"
      >
        全て
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
export interface HistoryFiltersProps {
  showArchived?: boolean | null
}

withDefaults(defineProps<HistoryFiltersProps>(), {
  showArchived: false,
})

const emit = defineEmits<{
  'update:showArchived': [value: boolean | null]
}>()

const handleFilterChange = (value: boolean | null) => {
  emit('update:showArchived', value)
}
</script>
