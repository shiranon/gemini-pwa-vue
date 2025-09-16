<template>
  <div class="border-destructive/40 bg-destructive/10 text-foreground mb-8 rounded-xl border p-6 shadow-sm">
    <div class="mb-6">
      <h2 class="text-destructive mb-2 text-xl font-semibold">危険な操作</h2>
      <p class="text-muted-foreground text-sm">これらの操作は元に戻すことができません</p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DangerCard
        title="全チャットデータを削除"
        description="すべてのチャット履歴とメッセージを完全に削除します。設定は保持されます。"
        icon="material-symbols:delete"
        button-text="全チャットを削除"
        :disabled="loading"
        @action="$emit('clear-chats')"
      />

      <DangerCard
        title="全データを削除"
        description="すべてのチャット履歴、設定、その他のデータを完全に削除します。"
        icon="material-symbols:warning"
        button-text="全データを削除"
        :disabled="loading"
        @action="$emit('clear-all-data')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DangerCard from '~/components/molecules/page-data/DangerCard.vue'

interface Props {
  loading: boolean
}

defineProps<Props>()
defineEmits<{
  'clear-chats': []
  'clear-all-data': []
}>()
</script>
