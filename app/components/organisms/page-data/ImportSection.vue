<template>
  <div class="bg-card text-card-foreground rounded-xl p-4 shadow-sm md:p-6">
    <div class="mb-6">
      <h2 class="text-foreground mb-2 text-xl font-semibold">データインポート・復元</h2>
      <p class="text-muted-foreground text-sm">バックアップファイルからデータを復元します</p>
    </div>

    <div class="space-y-4">
      <ImportOptions
        :options="importOptions"
        @update-options="updateOptions"
      />

      <DropZone @file-selected="$emit('file-selected', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImportOptions from '~/components/molecules/page-data/ImportOptions.vue'
import DropZone from '~/components/molecules/page-data/DropZone.vue'

interface ImportOptions {
  importChats: boolean
  importSettings: boolean
  replaceExisting: boolean
}

interface Props {
  importOptions: ImportOptions
}

defineProps<Props>()

const emit = defineEmits<{
  'file-selected': [file: File]
  'update-options': [key: keyof ImportOptions, value: boolean]
}>()

function updateOptions(key: keyof ImportOptions, value: boolean) {
  emit('update-options', key, value)
}
</script>
