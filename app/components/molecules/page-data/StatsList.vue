<template>
  <div class="border-border bg-card text-card-foreground mb-4 rounded-md border p-3">
    <div class="mb-2 flex items-center justify-between text-xs">
      <span class="text-muted-foreground">チャット数:</span>
      <span class="text-foreground font-medium">{{ stats?.totalChats || 0 }}件</span>
    </div>
    <div class="mb-2 flex items-center justify-between text-xs">
      <span class="text-muted-foreground">メッセージ数:</span>
      <span class="text-foreground font-medium">{{ stats?.totalMessages || 0 }}件</span>
    </div>
    <div class="flex items-center justify-between text-xs">
      <span class="text-muted-foreground">データサイズ:</span>
      <span class="text-foreground font-medium">{{ databaseSize }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DatabaseStats {
  totalChats: number
  totalMessages: number
}

interface Props {
  stats: DatabaseStats | null
  databaseSize: string
}

defineProps<Props>()
</script>
