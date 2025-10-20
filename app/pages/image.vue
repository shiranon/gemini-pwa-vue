<template>
  <div class="mx-auto w-full max-w-5xl flex-1 items-center justify-between px-4">
    <div class="bg-card text-card-foreground mb-6 rounded-lg p-4 shadow-sm md:p-6">
      <h1 class="text-foreground text-2xl font-bold">画像管理</h1>
    </div>

    <!-- タブ切り替え -->
    <Tabs
      v-model="activeTab"
      class="w-full"
    >
      <TabsList class="mb-6 grid w-full grid-cols-2">
        <TabsTrigger value="characters"> キャラクター画像 </TabsTrigger>
        <TabsTrigger value="backgrounds"> 背景画像 </TabsTrigger>
      </TabsList>

      <!-- キャラクター画像タブ -->
      <TabsContent value="characters">
        <!-- ローディング状態 -->
        <div
          v-if="isLoadingCharacters"
          class="flex justify-center py-8"
        >
          <Icon
            icon="material-symbols:loading"
            class="h-8 w-8 animate-spin"
          />
        </div>

        <!-- エラー状態 -->
        <div
          v-else-if="errorCharacters"
          class="text-destructive py-8 text-center"
        >
          {{ errorCharacters }}
        </div>

        <!-- キャラクター一覧 -->
        <div
          v-else
          class="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <!-- キャラクター追加カード -->
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
      </TabsContent>

      <!-- 背景画像タブ -->
      <TabsContent value="backgrounds">
        <!-- ローディング状態 -->
        <div
          v-if="isLoadingBackgrounds"
          class="flex justify-center py-8"
        >
          <Icon
            icon="material-symbols:loading"
            class="h-8 w-8 animate-spin"
          />
        </div>

        <!-- エラー状態 -->
        <div
          v-else-if="errorBackgrounds"
          class="text-destructive py-8 text-center"
        >
          {{ errorBackgrounds }}
        </div>

        <!-- カテゴリー一覧 -->
        <div
          v-else
          class="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <!-- カテゴリー追加カード -->
          <div
            class="border-border bg-card hover:bg-muted/50 cursor-pointer rounded-xl border border-dashed p-2 transition-all duration-200 hover:shadow-md"
            @click="showCategoryCreateModal = true"
          >
            <div class="flex flex-col items-center justify-center text-center">
              <div class="border-border bg-muted/50 mb-4 flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed">
                <Icon
                  icon="material-symbols:add-photo-alternate"
                  class="text-muted-foreground h-12 w-12 sm:h-16 sm:w-16"
                />
              </div>
              <h3 class="mb-2 text-lg font-semibold">カテゴリーを追加</h3>
              <p class="text-muted-foreground text-sm">背景画像のカテゴリーを追加できます</p>
            </div>
          </div>

          <!-- 既存のカテゴリー -->
          <BackgroundCategoryCard
            v-for="category in categories"
            :key="category.id"
            :category="category"
            class="relative"
            @select="selectCategory"
            @edit="editCategory"
            @delete="deleteCategory"
          />
        </div>
      </TabsContent>
    </Tabs>

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

    <!-- カテゴリー作成モーダル -->
    <BackgroundCategoryCreateModal
      v-model:open="showCategoryCreateModal"
      @created="handleCategoryCreated"
    />

    <!-- カテゴリー編集モーダル -->
    <BackgroundCategoryEditModal
      v-if="editingCategory"
      :category="editingCategory"
      @close="editingCategory = null"
      @updated="handleCategoryUpdated"
    />

    <!-- 背景画像一覧モーダル -->
    <BackgroundImageListModal
      v-if="selectedCategory"
      :category="selectedCategory"
      @close="handleImageListClosed"
      @back="handleImageListClosed"
      @updated="handleImageListUpdated"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import CharacterCreateModal from '~/components/organisms/page-image/CharacterCreateModal.vue'
import CharacterCard from '~/components/organisms/page-image/CharacterCard.vue'
import CharacterEditModal from '~/components/organisms/page-image/CharacterEditModal.vue'
import OutfitListModal from '~/components/organisms/page-image/OutfitListModal.vue'
import BackgroundCategoryCard from '~/components/organisms/page-image/BackgroundCategoryCard.vue'
import BackgroundCategoryCreateModal from '~/components/organisms/page-image/BackgroundCategoryCreateModal.vue'
import BackgroundCategoryEditModal from '~/components/organisms/page-image/BackgroundCategoryEditModal.vue'
import BackgroundImageListModal from '~/components/organisms/page-image/BackgroundImageListModal.vue'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { useBackgroundImages } from '~/composables/useBackgroundImages'
import { logger } from '~/lib/logger'
import type { CharacterRecord, CharacterOutfitRecord, BackgroundCategoryRecord } from '~/types/database'

// ページメタデータ
definePageMeta({
  title: '画像管理',
  description: 'キャラクター画像と背景画像の管理ページ',
})

// タブ状態
const activeTab = ref('characters')

// キャラクター画像機能
const { getCharacters, deleteCharacter: deleteCharacterFromDB, isLoading: isLoadingCharacters, error: errorCharacters } = useCharacterImages()

// 背景画像機能
const { getCategories, deleteCategory: deleteCategoryFromDB, isLoading: isLoadingBackgrounds, error: errorBackgrounds } = useBackgroundImages()

// キャラクター状態管理
const characters = ref<CharacterRecord[]>([])
const showCreateModal = ref(false)
const selectedCharacter = ref<CharacterRecord | null>(null)
const selectedOutfit = ref<CharacterOutfitRecord | null>(null)
const editingCharacter = ref<CharacterRecord | null>(null)

// 背景画像状態管理
const categories = ref<BackgroundCategoryRecord[]>([])
const showCategoryCreateModal = ref(false)
const selectedCategory = ref<BackgroundCategoryRecord | null>(null)
const editingCategory = ref<BackgroundCategoryRecord | null>(null)

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
      // 削除成功後、即座に配列から除外してカードを削除
      // これにより、削除されたキャラクターの画像読み込みが発生しない
      characters.value = characters.value.filter((c) => c.id !== character.id)
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

// ============================================================================
// 背景画像関連の処理
// ============================================================================

// カテゴリー一覧を読み込み
const loadCategories = async () => {
  try {
    categories.value = await getCategories()
  } catch (err) {
    logger.error('カテゴリー一覧の読み込みに失敗', { component: 'image.vue' }, err)
  }
}

// カテゴリーを選択
const selectCategory = (category: BackgroundCategoryRecord) => {
  selectedCategory.value = category
}

// カテゴリーを編集
const editCategory = (category: BackgroundCategoryRecord) => {
  editingCategory.value = category
}

// カテゴリーを削除
const deleteCategory = async (category: BackgroundCategoryRecord) => {
  const confirmed = await showConfirm(`「${category.name}」を削除しますか？関連する画像もすべて削除されます。`, 'カテゴリーの削除')
  if (!confirmed) {
    return
  }

  try {
    // 削除前にカテゴリの存在確認
    const categoryExists = categories.value.some((c) => c.id === category.id)
    if (!categoryExists) {
      logger.warn('削除対象のカテゴリが既に存在しません', { component: 'image.vue', categoryId: category.id })
      // ユーザーに通知
      await showConfirm('このカテゴリーは既に削除されています。', '削除済み')
      // 念のため一覧を再読み込み
      await loadCategories()
      return
    }

    const success = await deleteCategoryFromDB(category.id)
    if (success) {
      // 削除成功後、即座に配列から除外してカードを削除
      // これにより、削除されたカテゴリーの画像読み込みが発生しない
      categories.value = categories.value.filter((c) => c.id !== category.id)
      logger.info('カテゴリーの削除が完了しました', { component: 'image.vue', categoryId: category.id })
    } else {
      // 削除失敗時もユーザーに通知
      await showConfirm('カテゴリーの削除に失敗しました。もう一度お試しください。', '削除エラー')
    }
  } catch (err) {
    logger.error('カテゴリーの削除に失敗', { component: 'image.vue' }, err)
    // エラー時もユーザーに通知
    await showConfirm('カテゴリーの削除中にエラーが発生しました。', 'エラー')
  }
}

// カテゴリー作成完了時の処理
const handleCategoryCreated = async (_category: BackgroundCategoryRecord) => {
  await loadCategories()
  showCategoryCreateModal.value = false
}

// カテゴリー更新完了時の処理
const handleCategoryUpdated = async () => {
  await loadCategories()
  editingCategory.value = null
}

// 背景画像一覧モーダルが閉じられた時の処理
const handleImageListClosed = () => {
  selectedCategory.value = null
}

// 背景画像が追加・削除された時の処理
const handleImageListUpdated = async () => {
  await loadCategories()
}

// 初期化
onMounted(async () => {
  await loadCharacters()
  await loadCategories()
})
</script>
