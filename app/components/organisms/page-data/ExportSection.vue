<template>
  <div class="border-border bg-card text-card-foreground rounded-xl border p-4 shadow-sm md:p-6">
    <div class="mb-6">
      <h2 class="text-foreground mb-2 text-xl font-semibold">データエクスポート・バックアップ</h2>
      <p class="text-muted-foreground text-sm">チャット履歴と設定をファイルに保存します</p>

      <!-- ストレージクォータ情報 -->
      <div
        v-if="storageQuota?.quotaInfo?.value"
        class="border-border bg-muted/50 mt-4 rounded-lg border p-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon
              name="material-symbols:storage"
              class="text-muted-foreground h-4 w-4"
            />
            <span class="text-foreground text-sm font-medium">IndexedDBストレージ使用量目安</span>
          </div>
          <div class="text-right">
            <div class="text-foreground text-sm font-medium">
              {{ storageQuota.formatBytes(storageQuota.quotaInfo.value.usage) }} / {{ storageQuota.formatBytes(storageQuota.quotaInfo.value.quota) }}
            </div>
            <div class="text-muted-foreground text-xs">
              {{ storageQuota.formatUsagePercentage(storageQuota.quotaInfo.value.usagePercentage) }}
            </div>
          </div>
        </div>

        <!-- プログレスバー -->
        <div class="mt-2">
          <div class="bg-muted h-2 w-full rounded-full">
            <div
              class="h-2 rounded-full transition-all duration-300"
              :class="{
                'bg-green-500': storageQuota.quotaInfo.value.usagePercentage < 50,
                'bg-yellow-500': storageQuota.quotaInfo.value.usagePercentage >= 50 && storageQuota.quotaInfo.value.usagePercentage < 75,
                'bg-orange-500': storageQuota.quotaInfo.value.usagePercentage >= 75 && storageQuota.quotaInfo.value.usagePercentage < 90,
                'bg-red-500': storageQuota.quotaInfo.value.usagePercentage >= 90,
              }"
              :style="{ width: `${Math.min(storageQuota.quotaInfo.value.usagePercentage, 100)}%` }"
            />
          </div>
        </div>

        <!-- 警告メッセージ -->
        <div
          v-if="storageQuota.warningLevel?.value"
          class="mt-2"
        >
          <div
            class="flex items-center gap-2 rounded-md p-2 text-xs"
            :class="{
              'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300': storageQuota.warningLevel.value.level === 'info',
              'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300': storageQuota.warningLevel.value.level === 'warning',
              'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300': storageQuota.warningLevel.value.level === 'critical',
            }"
          >
            <Icon
              :name="
                storageQuota.warningLevel.value.level === 'info' ? 'material-symbols:info' : storageQuota.warningLevel.value.level === 'warning' ? 'material-symbols:warning' : 'material-symbols:error'
              "
              class="h-4 w-4"
            />
            {{ storageQuota.warningLevel.value.message }}
          </div>
        </div>
      </div>
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
  storageQuota?: {
    quotaInfo: {
      value: {
        usage: number
        quota: number
        usagePercentage: number
      } | null
    }
    warningLevel: {
      value: {
        level: 'info' | 'warning' | 'critical'
        message: string
      } | null
    }
    formatBytes: (bytes: number) => string
    formatUsagePercentage: (percentage: number) => string
  }
}

defineProps<Props>()
defineEmits<{
  'export-full': []
  'export-chats': []
}>()
</script>
