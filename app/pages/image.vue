<template>
  <div class="mx-auto max-w-6xl p-4">
    <!-- ヘッダー -->
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-bold">画像管理</h1>
    </div>

    <!-- ローディング状態 -->
    <div
      v-if="isLoading"
      class="flex justify-center py-8"
    >
      <Icon
        icon="material-symbols:loading"
        class="h-8 w-8 animate-spin"
      />
    </div>

    <!-- エラー状態 -->
    <div
      v-else-if="error"
      class="text-destructive py-8 text-center"
    >
      {{ error }}
    </div>

    <!-- キャラクター一覧 -->
    <div
      v-else-if="Object.keys(characterGroups).length > 0"
      class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-3"
    >
      <div
        v-for="(images, character) in characterGroups"
        :key="character"
        class="border-border bg-card cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg md:p-3"
        @click="selectCharacter(character)"
      >
        <!-- キャラクター名 -->
        <h3 class="mb-3 text-center text-lg font-semibold">{{ character }}</h3>

        <!-- サムネイル（1枚目） -->
        <div class="mb-3 flex justify-center">
          <img
            :src="`data:${images[0]?.mimeType};base64,${images[0]?.base64Data}`"
            :alt="`${character}の画像`"
            class="border-border h-30 w-30 rounded-lg border object-cover md:h-25 md:w-25"
          />
        </div>

        <!-- 画像数 -->
        <div class="text-muted-foreground text-center text-sm">{{ images.length }}枚</div>
      </div>
    </div>

    <!-- 空状態 -->
    <div
      v-else
      class="px-8 py-16 text-center"
    >
      <Icon
        icon="material-symbols:image"
        class="text-muted-foreground mx-auto h-16 w-16"
      />
      <h3 class="mt-4 text-lg font-semibold">画像がありません</h3>
      <p class="text-muted-foreground mt-2">最初のキャラクター画像をアップロードしてください</p>
      <Button
        class="mt-4"
        @click="showUploadModal = true"
      >
        <Icon
          icon="material-symbols:add"
          class="mr-2 h-4 w-4"
        />
        画像をアップロード
      </Button>
    </div>

    <!-- アップロードモーダル -->
    <CharacterImageUploadModal
      v-if="showUploadModal"
      @close="showUploadModal = false"
      @uploaded="handleImageUploaded"
    />

    <!-- キャラクター詳細モーダル -->
    <CharacterDetailModal
      v-if="selectedCharacter"
      :character="selectedCharacter"
      :images="characterGroups[selectedCharacter] || []"
      @close="selectedCharacter = null"
      @image-deleted="handleImageDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import CharacterImageUploadModal from '~/components/organisms/page-image/CharacterImageUploadModal.vue'
import CharacterDetailModal from '~/components/organisms/page-image/CharacterDetailModal.vue'
import { useCharacterImages } from '~/composables/useCharacterImages'
import type { CharacterImageAssetRecord } from '~/types/database'

// ページメタデータ
definePageMeta({
  title: '画像管理',
  description: 'キャラクター画像の管理ページ',
})

const { getImagesGroupedByCharacter, isLoading, error } = useCharacterImages()

// 状態管理
const characterGroups = ref<Record<string, CharacterImageAssetRecord[]>>({})
const showUploadModal = ref(false)
const selectedCharacter = ref<string | null>(null)

// キャラクター一覧を読み込み
const loadCharacterGroups = async () => {
  try {
    characterGroups.value = await getImagesGroupedByCharacter()
  } catch (err) {
    console.error('キャラクター一覧の読み込みに失敗:', err)
  }
}

// キャラクターを選択
const selectCharacter = (character: string) => {
  selectedCharacter.value = character
}

// 画像アップロード完了時の処理
const handleImageUploaded = async () => {
  await loadCharacterGroups()
  showUploadModal.value = false
}

// 画像削除完了時の処理
const handleImageDeleted = async () => {
  await loadCharacterGroups()
  // 削除後にキャラクターの画像がなくなった場合は詳細モーダルを閉じる
  if (selectedCharacter.value && !characterGroups.value[selectedCharacter.value]?.length) {
    selectedCharacter.value = null
  }
}

// 初期化
onMounted(async () => {
  await loadCharacterGroups()
})
</script>
