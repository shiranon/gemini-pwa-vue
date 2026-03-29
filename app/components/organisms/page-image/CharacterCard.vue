<template>
  <div
    class="border-border bg-card hover:bg-muted/50 group relative cursor-pointer rounded-xl border p-2 transition-all duration-200 hover:shadow-md"
    :class="{ 'ring-primary ring-2': selectable && selected }"
    @click="handleCardClick"
  >
    <!-- 選択モード時のチェックボックス -->
    <div
      v-if="selectable"
      class="absolute top-2 left-2 z-10"
    >
      <div
        class="border-border bg-background flex h-5 w-5 items-center justify-center rounded border"
        :class="{ 'bg-primary border-primary': selected }"
      >
        <Icon
          v-if="selected"
          icon="material-symbols:check"
          class="text-primary-foreground h-3 w-3"
        />
      </div>
    </div>

    <div class="flex flex-col items-center justify-center text-center">
      <!-- キャラクターサムネイル -->
      <div class="border-border bg-muted mb-4 flex w-full items-center justify-center overflow-hidden rounded-2xl border">
        <img
          v-if="thumbnailImage && !isLoadingThumbnail"
          :src="`data:${thumbnailImage.mimeType};base64,${thumbnailImage.base64Data}`"
          :alt="character.name"
          class="h-full w-full object-cover"
        />
        <Icon
          v-else-if="isLoadingThumbnail"
          icon="line-md:loading-alt-loop"
          class="text-muted-foreground size-20 animate-spin sm:size-24"
        />
        <Icon
          v-else
          icon="material-symbols:person"
          class="text-muted-foreground size-20 sm:size-24"
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

    <!-- アクションボタン（ホバー時に表示、選択モードでは非表示） -->
    <div
      v-if="!selectable"
      class="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
    >
      <div class="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          class="bg-background/80 hover:bg-background h-8 w-8 p-0"
          @click.stop="copyCharacterText"
        >
          <Icon
            icon="material-symbols:content-copy"
            class="h-4 w-4"
          />
        </Button>
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

    <!-- コピー完了通知 -->
    <div
      v-if="showCopyNotification"
      class="bg-background/90 absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm transition-opacity duration-200"
    >
      <div class="bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg">
        <Icon
          icon="material-symbols:check-circle"
          class="h-5 w-5"
        />
        <span class="text-sm font-medium">コピーしました</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { CharacterRecord, CharacterImageRecord } from '~/types/database'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { logger } from '~/lib/logger'

interface Props {
  character: CharacterRecord
  selectable?: boolean
  selected?: boolean
}

interface Emits {
  select: [character: CharacterRecord]
  edit: [character: CharacterRecord]
  delete: [character: CharacterRecord]
  'toggle-select': [character: CharacterRecord]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getCharacterFirstImage, getOutfits, getCharacterAllExpressions } = useCharacterImages()
const thumbnailImage = ref<CharacterImageRecord | null>(null)
const isLoadingThumbnail = ref(true)
const showCopyNotification = ref(false)
let copyNotificationTimer: ReturnType<typeof setTimeout> | null = null

// サムネイル画像を読み込み
const loadThumbnail = async () => {
  try {
    isLoadingThumbnail.value = true
    thumbnailImage.value = await getCharacterFirstImage(props.character.id)
  } catch (error) {
    logger.error('サムネイル画像の読み込みに失敗', { component: 'CharacterCard' }, error)
  } finally {
    isLoadingThumbnail.value = false
  }
}

// カードクリック時の処理
const handleCardClick = () => {
  if (props.selectable) {
    emit('toggle-select', props.character)
  } else {
    emit('select', props.character)
  }
}

// キャラクターを編集
const editCharacter = () => {
  emit('edit', props.character)
}

// キャラクターを削除
const deleteCharacter = () => {
  emit('delete', props.character)
}

// キャラクターテキストをコピー
const copyCharacterText = async () => {
  try {
    // キャラクターの衣装一覧を取得
    const outfits = await getOutfits(props.character.id)

    // キャラクターの全表情を取得
    const allExpressions = await getCharacterAllExpressions(props.character.id)

    // 衣装名のリストを作成
    const outfitNames = outfits.map((outfit) => outfit.name)

    // 表情名のリストを作成（重複を除去）
    const expressionNames = [...new Set(allExpressions.map((img) => img.expression))]

    // テキストテンプレートを生成
    const textTemplate = `【画像URL】
:character/${props.character.name}/{現在の服装}/{下記の中から最適な表情を選択}

【URLリスト】
【マークダウンの対象となるキャラクタ】
${props.character.name}
【マークダウンの対象となる対象服装一覧】
${outfitNames.join('\n')}
【マークダウンの対象となる対象表情一覧】
${expressionNames.join('\n')}`

    // クリップボードにコピー
    await navigator.clipboard.writeText(textTemplate)

    // 通知を表示
    showCopyNotification.value = true

    // 1.5秒後に通知を非表示
    copyNotificationTimer = setTimeout(() => {
      showCopyNotification.value = false
      copyNotificationTimer = null
    }, 1500)

    // 成功通知（必要に応じて）
    logger.info('キャラクターテキストをコピーしました', {
      component: 'CharacterCard',
      characterName: props.character.name,
      outfitCount: outfitNames.length,
      expressionCount: expressionNames.length,
    })
  } catch (error) {
    logger.error('キャラクターテキストのコピーに失敗しました', { component: 'CharacterCard' }, error)
  }
}

// コンポーネントマウント時にサムネイルを読み込み
onMounted(() => {
  loadThumbnail()
})

onUnmounted(() => {
  if (copyNotificationTimer) {
    clearTimeout(copyNotificationTimer)
  }
})
</script>
