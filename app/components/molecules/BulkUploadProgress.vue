<template>
  <div class="space-y-4">
    <!-- プログレスバー -->
    <div class="space-y-2">
      <div class="flex justify-between text-sm">
        <span class="font-medium">アップロード進捗</span>
        <span class="text-muted-foreground">{{ progress.processedFiles }} / {{ progress.totalFiles }}</span>
      </div>
      <div class="bg-muted h-2 w-full rounded-full">
        <div
          class="bg-primary h-2 rounded-full transition-all duration-300"
          :style="{ width: progressPercentage + '%' }"
        />
      </div>
    </div>

    <!-- 現在のファイル -->
    <div
      v-if="progress.currentFile"
      class="text-muted-foreground text-sm"
    >
      処理中: {{ progress.currentFile }}
    </div>

    <!-- エラー表示 -->
    <div
      v-if="progress.errors.length > 0"
      class="space-y-2"
    >
      <div class="text-destructive text-sm font-medium">エラー ({{ progress.errors.length }}件)</div>
      <div class="max-h-32 space-y-1 overflow-y-auto">
        <div
          v-for="(error, index) in progress.errors"
          :key="index"
          class="text-destructive bg-destructive/10 rounded px-2 py-1 text-xs"
        >
          {{ error }}
        </div>
      </div>
    </div>

    <!-- 完了メッセージ -->
    <div
      v-if="progress.isComplete"
      class="text-sm"
      :class="progress.errors.length > 0 ? 'text-warning' : 'text-success'"
    >
      <Icon
        :icon="progress.errors.length > 0 ? 'material-symbols:warning' : 'material-symbols:check-circle'"
        class="mr-1 inline h-4 w-4"
      />
      {{ progress.errors.length > 0 ? '一部のファイルでエラーが発生しました' : 'アップロードが完了しました' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

interface Props {
  progress: {
    totalFiles: number
    processedFiles: number
    currentFile: string
    isComplete: boolean
    errors: readonly string[]
  }
}

const props = defineProps<Props>()

const progressPercentage = computed(() => {
  if (props.progress.totalFiles === 0) return 0
  return Math.round((props.progress.processedFiles / props.progress.totalFiles) * 100)
})
</script>
