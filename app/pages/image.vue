<template>
  <div class="mx-auto w-full max-w-5xl flex-1 items-center justify-between px-4">
    <div class="bg-card text-card-foreground mb-6 rounded-lg p-4 shadow-sm md:p-6">
      <h1 class="text-foreground text-2xl font-bold">画像管理</h1>
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
      v-else
      class="grid grid-cols-2 gap-4 sm:grid-cols-3"
    >
      <!-- キャラクター追加カード（常に最初に表示） -->
      <div
        class="border-border bg-card hover:bg-muted/50 cursor-pointer rounded-xl border border-dashed p-6 transition-all duration-200 hover:shadow-md"
        @click="showCreateModal = true"
      >
        <div class="flex flex-col items-center text-center">
          <div class="border-border bg-muted/50 mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-dashed sm:h-24 sm:w-24">
            <Icon
              icon="material-symbols:person-add"
              class="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10"
            />
          </div>
          <h3 class="mb-2 text-lg font-semibold">キャラクターを追加</h3>
          <p class="text-muted-foreground text-sm">キャラクター画像を追加できます</p>
        </div>
      </div>

      <!-- 既存のキャラクター -->
      <CharacterCard
        v-for="character in characters"
        :key="character.id"
        :character="character"
        class="relative"
        @select="selectCharacter"
        @edit="editCharacter"
        @delete="deleteCharacter"
      />
    </div>

    <!-- キャラクター作成モーダル -->
    <CharacterCreateModal
      v-model:open="showCreateModal"
      @created="handleCharacterCreated"
    />

    <!-- キャラクター編集モーダル -->
    <CharacterEditModal
      v-if="editingCharacter"
      :character="editingCharacter"
      @close="editingCharacter = null"
      @updated="handleCharacterUpdated"
    />

    <!-- 衣装一覧モーダル -->
    <OutfitListModal
      v-if="selectedCharacter"
      :character="selectedCharacter"
      @close="handleOutfitListClosed"
      @back="handleOutfitListClosed"
      @outfit-selected="handleOutfitSelected"
    />

    <!-- 確認ダイアログ -->
    <ConfirmDialog
      v-model="isConfirmDialogOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      @confirm="handleConfirmOk"
      @cancel="handleConfirmCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import CharacterCreateModal from '~/components/organisms/page-image/CharacterCreateModal.vue'
import CharacterCard from '~/components/organisms/page-image/CharacterCard.vue'
import CharacterEditModal from '~/components/organisms/page-image/CharacterEditModal.vue'
import OutfitListModal from '~/components/organisms/page-image/OutfitListModal.vue'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { logger } from '~/utils/logger'
import type { CharacterRecord, CharacterOutfitRecord } from '~/types/database'

// ページメタデータ
definePageMeta({
  title: '画像管理',
  description: 'キャラクター画像の管理ページ',
})

const { getCharacters, deleteCharacter: deleteCharacterFromDB, isLoading, error } = useCharacterImages()

// 状態管理
const characters = ref<CharacterRecord[]>([])
const showCreateModal = ref(false)
const selectedCharacter = ref<CharacterRecord | null>(null)
const selectedOutfit = ref<CharacterOutfitRecord | null>(null)
const editingCharacter = ref<CharacterRecord | null>(null)

// ダイアログの状態管理
const isConfirmDialogOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmResolve = ref<((value: boolean) => void) | null>(null)

// ダイアログ表示関数
const showConfirm = (message: string, title = '確認'): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmTitle.value = title
    confirmMessage.value = message
    confirmResolve.value = resolve
    isConfirmDialogOpen.value = true
  })
}

// ダイアログハンドラー
const handleConfirmOk = () => {
  if (confirmResolve.value) {
    confirmResolve.value(true)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
}

const handleConfirmCancel = () => {
  if (confirmResolve.value) {
    confirmResolve.value(false)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
}

// キャラクター一覧を読み込み
const loadCharacters = async () => {
  try {
    characters.value = await getCharacters()
  } catch (err) {
    logger.error('キャラクター一覧の読み込みに失敗', { component: 'image.vue' }, err)
  }
}

// キャラクターを選択
const selectCharacter = (character: CharacterRecord) => {
  selectedCharacter.value = character
}

// キャラクターを編集
const editCharacter = (character: CharacterRecord) => {
  editingCharacter.value = character
}

// キャラクターを削除
const deleteCharacter = async (character: CharacterRecord) => {
  const confirmed = await showConfirm(`「${character.name}」を削除しますか？関連する衣装と画像もすべて削除されます。`, 'キャラクターの削除')
  if (!confirmed) {
    return
  }

  try {
    const success = await deleteCharacterFromDB(character.id)
    if (success) {
      await loadCharacters()
    }
  } catch (err) {
    logger.error('キャラクターの削除に失敗', { component: 'image.vue' }, err)
  }
}

// キャラクター作成完了時の処理
const handleCharacterCreated = async (_character: CharacterRecord) => {
  // キャラクター一覧を再読み込み
  await loadCharacters()
  showCreateModal.value = false
}

// キャラクター更新完了時の処理
const handleCharacterUpdated = async () => {
  await loadCharacters()
  editingCharacter.value = null
}

// 衣装選択完了時の処理
const handleOutfitSelected = (outfit: CharacterOutfitRecord) => {
  selectedOutfit.value = outfit
}

// 衣装一覧モーダルが閉じられた時の処理
const handleOutfitListClosed = () => {
  selectedCharacter.value = null
}

// 初期化
onMounted(async () => {
  await loadCharacters()
})
</script>
