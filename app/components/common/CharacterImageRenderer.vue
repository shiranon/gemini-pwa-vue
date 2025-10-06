<template>
  <div class="character-image-renderer">
    <div
      v-if="isLoading"
      class="flex items-center justify-center p-4"
    >
      <Icon
        icon="material-symbols:loading"
        class="text-muted-foreground h-6 w-6 animate-spin"
      />
    </div>
    <div
      v-else-if="error"
      class="text-destructive flex items-center justify-center p-4"
    >
      <Icon
        icon="material-symbols:error"
        class="mr-2 h-5 w-5"
      />
      <span class="text-sm">{{ error }}</span>
    </div>
    <img
      v-else-if="hasImage && imageData"
      :src="`data:${imageData.mimeType};base64,${imageData.base64Data}`"
      :alt="alt || `${characterName} - ${outfitName} - ${expression}`"
      :title="title || `${characterName} - ${outfitName} - ${expression}`"
      class="character-image"
      loading="lazy"
      decoding="async"
    />
    <div
      v-else
      class="text-muted-foreground flex items-center justify-center p-4"
    >
      <Icon
        icon="material-symbols:image-not-supported"
        class="mr-2 h-5 w-5"
      />
      <span class="text-sm">画像が見つかりません</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import type { CharacterImageRecord } from '~/types/database'
import { useCharacterImages } from '~/composables/useCharacterImages'
import { logger } from '~/utils/logger'

interface Props {
  characterName: string
  outfitName: string
  expression: string
  alt?: string
  title?: string | null
}

const props = defineProps<Props>()

const { getCharacterImageByNames } = useCharacterImages()
const imageData = ref<CharacterImageRecord | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasImage = ref(false)

const loadImage = async () => {
  isLoading.value = true
  error.value = null
  hasImage.value = false

  try {
    const result = await getCharacterImageByNames(props.characterName, props.outfitName, props.expression)

    if (result) {
      imageData.value = result
      hasImage.value = true
    } else {
      // 画像が見つからない場合はエラーではなく、単に画像なし状態
      imageData.value = null
      hasImage.value = false
    }
  } catch (err) {
    error.value = '画像の読み込みに失敗しました'
    imageData.value = null
    hasImage.value = false
    logger.error('CharacterImageRenderer: 画像の読み込みエラー', { component: 'CharacterImageRenderer' }, err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadImage()
})
</script>

<style scoped>
.character-image-renderer {
  background-color: color-mix(in srgb, var(--muted) 75%, rgba(0, 0, 0, 0));
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  width: min(100%, var(--message-image-width, 100%));
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-inline-start: var(--message-image-margin-inline-start, 0);
  margin-inline-end: var(--message-image-margin-inline-end, 0);
}

.character-image {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: inherit;
}
</style>
