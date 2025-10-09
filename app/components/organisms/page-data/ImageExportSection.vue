<template>
  <div class="border-border bg-card text-card-foreground rounded-xl border p-4 shadow-sm md:p-6">
    <div class="mb-6">
      <h2 class="text-foreground mb-2 text-xl font-semibold">画像エクスポート</h2>
      <p class="text-muted-foreground text-sm">キャラクター画像をZIPファイルでダウンロードできます</p>

      <!-- 統計情報 -->
      <div
        v-if="imageStats"
        class="border-border bg-muted/50 mt-4 rounded-lg border p-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Image class="text-muted-foreground h-4 w-4" />
            <span class="text-foreground text-sm font-medium">画像統計</span>
          </div>
          <div class="text-right">
            <div class="text-foreground text-sm font-medium">{{ imageStats.totalImages }}件の画像</div>
            <div class="text-muted-foreground text-xs">
              {{ formatFileSize(imageStats.totalSize) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- フィルタ設定 -->
    <div class="mb-6 space-y-4">
      <h3 class="text-foreground text-lg font-medium">エクスポート設定</h3>

      <!-- キャラクターフィルタ -->
      <div>
        <label class="text-foreground mb-2 block text-sm font-medium">キャラクター</label>
        <div class="space-y-2">
          <label class="flex items-center space-x-2">
            <input
              v-model="selectAllCharacters"
              type="checkbox"
              class="rounded border-gray-300"
              @change="toggleAllCharacters"
            />
            <span class="text-sm">すべて選択</span>
          </label>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label
              v-for="character in imageStats?.characters || []"
              :key="character.id"
              class="hover:bg-muted/50 flex items-center space-x-2 rounded-md border p-2"
            >
              <input
                v-model="selectedCharacterIds"
                :value="character.id"
                type="checkbox"
                class="rounded border-gray-300"
              />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{{ character.name }}</div>
                <div class="text-muted-foreground text-xs">{{ character.imageCount }}件</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- エクスポートオプション -->
      <div class="space-y-3">
        <h4 class="text-foreground text-sm font-medium">エクスポートオプション</h4>

        <div class="space-y-2">
          <label class="flex items-center space-x-2">
            <input
              v-model="exportOptions.includeMetadata"
              type="checkbox"
              class="rounded border-gray-300"
            />
            <span class="text-sm">メタデータファイルを含める</span>
          </label>

          <div>
            <label class="text-foreground mb-1 block text-sm">フォルダ構造</label>
            <select
              v-model="exportOptions.folderStructure"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="hierarchical">階層構造 (キャラクター/衣装/表情.png)</option>
              <option value="flat">フラット構造 (キャラクター_衣装_表情.png)</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- エクスポートボタン -->
    <div class="flex flex-col gap-3 sm:flex-row">
      <button
        :disabled="isLoading || !hasSelectedImages"
        class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleExport"
      >
        <Loader2
          v-if="isLoading"
          :class="{ 'animate-spin': isLoading }"
          class="h-4 w-4"
        />
        <Download
          v-else
          class="h-4 w-4"
        />
        {{ isLoading ? 'エクスポート中...' : '画像をエクスポート' }}
      </button>

      <button
        :disabled="isLoading"
        class="border-border bg-muted text-foreground hover:bg-muted/80 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleRefresh"
      >
        <RefreshCw class="h-4 w-4" />
        統計を更新
      </button>
    </div>

    <!-- 進捗表示 -->
    <div
      v-if="isLoading && progress > 0"
      class="mt-4"
    >
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">エクスポート中...</span>
        <span class="text-foreground font-medium">{{ progress }}%</span>
      </div>
      <div class="bg-muted mt-2 h-2 w-full rounded-full">
        <div
          class="bg-primary h-2 rounded-full transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- エラー表示 -->
    <div
      v-if="error"
      class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="h-4 w-4" />
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Image, Download, RefreshCw, AlertCircle, Loader2 } from 'lucide-vue-next'
import { useImageExport } from '~/composables/useImageExport'

const { isLoading, error, progress, getImageStats, getAllImageData, filterImages, exportImagesAsZip, formatFileSize } = useImageExport()

// 状態管理
const imageStats = ref<{
  totalImages: number
  totalSize: number
  characters: { id: string; name: string; imageCount: number }[]
  outfits: { id: string; characterId: string; name: string; imageCount: number }[]
} | null>(null)

const selectedCharacterIds = ref<string[]>([])
const selectAllCharacters = ref(false)

const exportOptions = ref({
  includeMetadata: true,
  folderStructure: 'hierarchical' as 'flat' | 'hierarchical',
})

// 計算プロパティ

const hasSelectedImages = computed(() => {
  if (!imageStats.value) return false

  if (selectedCharacterIds.value.length === 0) return false

  // 選択されたキャラクターの画像があるかチェック
  return imageStats.value.characters.some((char) => selectedCharacterIds.value.includes(char.id) && char.imageCount > 0)
})

// メソッド
const loadImageStats = async () => {
  const stats = await getImageStats()
  if (stats) {
    imageStats.value = stats
    // デフォルトで全キャラクターを選択
    selectedCharacterIds.value = stats.characters.map((c) => c.id)
    selectAllCharacters.value = true
  }
}

const handleExport = async () => {
  if (!imageStats.value) return

  const data = await getAllImageData()
  if (!data) return

  const filteredImages = filterImages(data.images, data.characters, data.outfits, {
    characterIds: selectedCharacterIds.value,
  })

  if (filteredImages.length === 0) {
    // エラーメッセージを表示するために一時的にerrorを設定
    // 実際のエラーハンドリングはuseImageExport内で行う
    console.warn('エクスポートする画像がありません')
    return
  }

  await exportImagesAsZip(filteredImages, data.characters, data.outfits, exportOptions.value)
}

const handleRefresh = async () => {
  await loadImageStats()
}

const toggleAllCharacters = () => {
  if (selectAllCharacters.value) {
    selectedCharacterIds.value = imageStats.value?.characters.map((c) => c.id) || []
  } else {
    selectedCharacterIds.value = []
  }
}

// ライフサイクル
onMounted(() => {
  loadImageStats()
})
</script>
