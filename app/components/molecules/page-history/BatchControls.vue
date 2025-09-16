<template>
  <div class="border-primary/30 bg-primary/10 rounded-lg border p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Checkbox
            :model-value="selectAllChecked"
            @update:model-value="handleSelectAll"
          />
          <label class="text-foreground text-sm"> 全て選択 ({{ selectedCount }} / {{ totalCount }} 選択中) </label>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button
          :disabled="selectedCount === 0"
          variant="default"
          size="sm"
          @click="$emit('batch-export')"
        >
          <template #icon>
            <Icon icon="material-symbols:download" />
          </template>
          エクスポート
        </Button>

        <Button
          :disabled="selectedCount === 0"
          variant="secondary"
          size="sm"
          @click="$emit('batch-archive')"
        >
          <template #icon>
            <Icon icon="material-symbols:archive" />
          </template>
          アーカイブ
        </Button>

        <Button
          :disabled="selectedCount === 0"
          variant="destructive"
          size="sm"
          @click="$emit('batch-delete')"
        >
          <template #icon>
            <Icon icon="material-symbols:delete" />
          </template>
          削除
        </Button>

        <Button
          variant="ghost"
          size="sm"
          @click="$emit('cancel')"
        >
          キャンセル
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'

export interface BatchControlsProps {
  selectAllChecked?: boolean
  selectedCount?: number
  totalCount?: number
}

withDefaults(defineProps<BatchControlsProps>(), {
  selectAllChecked: false,
  selectedCount: 0,
  totalCount: 0,
})

const emit = defineEmits<{
  'select-all': [checked: boolean]
  'batch-export': []
  'batch-archive': []
  'batch-delete': []
  cancel: []
}>()

const handleSelectAll = (checked: boolean | 'indeterminate') => {
  const booleanChecked = checked === true
  emit('select-all', booleanChecked)
}
</script>
