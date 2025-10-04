<template>
  <div
    class="border-border bg-card hover:bg-muted/50 group cursor-pointer rounded-xl border p-6 transition-all duration-200 hover:shadow-md"
    @click="selectCharacter"
  >
    <div class="flex flex-col items-center text-center">
      <!-- キャラクターアイコン -->
      <div class="border-border bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full border sm:h-24 sm:w-24">
        <Icon
          icon="material-symbols:person"
          class="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10"
        />
      </div>

      <!-- キャラクター名 -->
      <h3 class="mb-2 line-clamp-2 text-lg font-semibold">{{ character.name }}</h3>

      <!-- 説明 -->
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
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { CharacterRecord } from '~/types/database'

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
</script>
