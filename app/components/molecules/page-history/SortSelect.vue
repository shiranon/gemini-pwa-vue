<template>
  <Select
    :default-value="sortOrder"
    @update:model-value="handleSortChange"
  >
    <SelectTrigger class="w-[180px]">
      <SelectValue placeholder="ソート順を選択" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="option in sortOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

export type SortOrderType = 'updatedAt' | 'createdAt' | 'title'

export interface SortSelectProps {
  /** ソート順 */
  sortOrder?: SortOrderType
}

withDefaults(defineProps<SortSelectProps>(), {
  sortOrder: 'updatedAt',
})

const emit = defineEmits<{
  'update:sortOrder': [sortOrder: SortOrderType]
}>()

/** ソートオプション */
const sortOptions = [
  { label: '更新日時順', value: 'updatedAt' },
  { label: '作成日時順', value: 'createdAt' },
  { label: 'タイトル順', value: 'title' },
]

/** ソート変更ハンドラー */
const handleSortChange = (value: AcceptableValue) => {
  if (value && typeof value === 'string') {
    emit('update:sortOrder', value as SortOrderType)
  }
}
</script>
