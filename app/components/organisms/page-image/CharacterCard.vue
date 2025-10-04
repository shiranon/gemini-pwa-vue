<template>
  <div
    class="border-border bg-card hover:bg-muted/50 group cursor-pointer rounded-xl border p-2 transition-all duration-200 hover:shadow-md"
    @click="selectCharacter"
  >
    <div class="flex flex-col items-center justify-center text-center">
      <!-- キャラクターサムネイル -->
      <div class="border-border bg-muted mb-4 flex w-full items-center justify-center overflow-hidden rounded-2xl border">
        <img
          v-if="thumbnailImage"
          :src="`data:${thumbnailImage.mimeType};base64,${thumbnailImage.base64Data}`"
          :alt="character.name"
          class="h-full w-full object-cover"
        />
        <Icon
          v-else
          icon="material-symbols:person"
          class="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10"
        />
      </div>

      <h3 class="mb-2 line-clamp-2 text-lg font-semibold">{{ character.name }}</h3>

      <div
        v-if="character.description"
        class="text-muted-foreground line-clamp-3 text-sm"
      >
        {{ character.description }}
      </div>
    </div>

    <!-- アクションボタン（ホバー時に表示） -->
    <div class="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div class="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          class="bg-background/80 hover:bg-background h-8 w-8 p-0"
          @click.stop="editCharacter"
        >
          <Icon
            icon="material-symbols:edit"
            class="h-4 w-4"
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="bg-background/80 hover:bg-background text-destructive hover:text-destructive h-8 w-8 p-0"
          @click.stop="deleteCharacter"
        >
          <Icon
            icon="material-symbols:delete"
            class="h-4 w-4"
          />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { CharacterRecord, CharacterImageRecord } from '~/types/database'
import { useCharacterImages } from '~/composables/useCharacterImages'

interface Props {
  character: CharacterRecord
}

interface Emits {
  select: [character: CharacterRecord]
  edit: [character: CharacterRecord]
  delete: [character: CharacterRecord]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getCharacterFirstImage } = useCharacterImages()
const thumbnailImage = ref<CharacterImageRecord | null>(null)

// サムネイル画像を読み込み
const loadThumbnail = async () => {
  try {
    thumbnailImage.value = await getCharacterFirstImage(props.character.id)
  } catch (error) {
    console.error('サムネイル画像の読み込みに失敗:', error)
  }
}

// キャラクターを選択
const selectCharacter = () => {
  emit('select', props.character)
}

// キャラクターを編集
const editCharacter = () => {
  emit('edit', props.character)
}

// キャラクターを削除
const deleteCharacter = () => {
  emit('delete', props.character)
}

// コンポーネントマウント時にサムネイルを読み込み
onMounted(() => {
  loadThumbnail()
})
</script>
