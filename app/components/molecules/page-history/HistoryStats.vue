<template>
  <div
    v-if="stats"
    class="text-muted-foreground text-sm"
  >
    全 {{ stats.totalChats }} チャット・{{ stats.totalMessages }} メッセージ
  </div>
</template>

<script setup lang="ts">
export interface HistoryStatsData {
  totalChats: number
  totalMessages: number
}

export interface HistoryStatsProps {
  stats?: HistoryStatsData | null
}

defineProps<HistoryStatsProps>()
</script>
