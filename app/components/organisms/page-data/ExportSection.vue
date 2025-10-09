<template>
  <div class="border-border bg-card text-card-foreground rounded-xl border p-4 shadow-sm md:p-6">
    <div class="mb-6">
      <h2 class="text-foreground mb-2 text-xl font-semibold">データエクスポート・バックアップ</h2>
      <p class="text-muted-foreground text-sm">チャット履歴と設定をファイルに保存します</p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ExportCard
        title="完全バックアップ"
        subtitle="全データ（チャット・設定）"
        icon="material-symbols:download"
        icon-bg-class="bg-primary/10 text-primary"
        :show-stats="true"
        :stats="stats"
        :database-size="databaseSize || ''"
        button-text="完全バックアップをダウンロード"
        button-icon="material-symbols:download"
        button-class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="loading || (stats?.totalChats || 0) === 0"
        @export="$emit('export-full')"
      />

      <ExportCard
        title="チャットデータのみ"
        subtitle="会話履歴のみ"
        icon="material-symbols:chat"
        icon-bg-class="bg-primary/10 text-primary"
        :show-stats="false"
        description="チャット履歴とメッセージを標準的なJSON形式でエクスポートします。設定は含まれません。"
        button-text="チャットデータをダウンロード"
        button-icon="material-symbols:file-save"
        button-class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="loading || (stats?.totalChats || 0) === 0"
        @export="$emit('export-chats')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ExportCard from '~/components/molecules/page-data/ExportCard.vue'

interface DatabaseStats {
  totalChats: number
  totalMessages: number
}

interface Props {
  stats: DatabaseStats | null
  databaseSize: string
  loading: boolean
}

defineProps<Props>()
defineEmits<{
  'export-full': []
  'export-chats': []
}>()
</script>
