<template>
  <div
    class="text-foreground mb-8 rounded-lg border p-4"
    :class="{
      'border-primary/40 bg-primary/10': result.success,
      'border-destructive/40 bg-destructive/10': !result.success,
    }"
  >
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon
          v-if="result.success"
          icon="material-symbols:check-circle"
          class="text-primary h-5 w-5"
        />
        <Icon
          v-else
          icon="material-symbols:error"
          class="text-destructive h-5 w-5"
        />
        <h3 class="font-medium">
          {{ result.success ? 'インポート完了' : 'インポートエラー' }}
        </h3>
      </div>
      <Button
        variant="ghost"
        size="sm"
        @click="$emit('close')"
      >
        <Icon
          icon="material-symbols:close"
          class="h-4 w-4"
        />
      </Button>
    </div>

    <div>
      <div
        v-if="result.success"
        class="space-y-2"
      >
        <p class="text-sm">
          <span class="font-medium">チャット:</span>
          {{ result.imported.chats }}件インポート
        </p>
        <p class="text-sm">
          <span class="font-medium">設定:</span>
          {{ result.imported.settings ? 'インポート済み' : 'スキップ' }}
        </p>
      </div>

      <div
        v-if="result.warnings.length > 0"
        class="mt-3"
      >
        <h4 class="text-accent-foreground mb-1 text-sm font-medium">警告:</h4>
        <ul class="text-muted-foreground space-y-1 text-xs">
          <li
            v-for="warning in result.warnings"
            :key="warning"
          >
            • {{ warning }}
          </li>
        </ul>
      </div>

      <div
        v-if="result.errors.length > 0"
        class="mt-3"
      >
        <h4 class="text-destructive mb-1 text-sm font-medium">エラー:</h4>
        <ul class="text-destructive space-y-1 text-xs">
          <li
            v-for="error in result.errors"
            :key="error"
          >
            • {{ error }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { ImportResult } from '~/lib/backup'

interface Props {
  result: ImportResult
}

defineProps<Props>()
defineEmits<{
  close: []
}>()
</script>
