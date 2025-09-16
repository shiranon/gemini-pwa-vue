<template>
  <div class="flex justify-center">
    <div class="flex items-center gap-2">
      <Button
        :disabled="currentPage === 1"
        variant="ghost"
        size="sm"
        @click="handlePageChange(currentPage - 1)"
      >
        前へ
      </Button>

      <span class="text-muted-foreground px-4 py-2 text-sm"> {{ currentPage }} / {{ totalPages }} ページ </span>

      <Button
        :disabled="currentPage === totalPages"
        variant="ghost"
        size="sm"
        @click="handlePageChange(currentPage + 1)"
      >
        次へ
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'

export interface PaginationControlsProps {
  currentPage?: number
  totalPages?: number
}

const props = withDefaults(defineProps<PaginationControlsProps>(), {
  currentPage: 1,
  totalPages: 1,
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
}>()

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:currentPage', page)
  }
}
</script>
