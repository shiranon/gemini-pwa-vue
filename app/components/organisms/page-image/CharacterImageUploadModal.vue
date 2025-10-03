<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-background border-border w-full max-w-md rounded-lg border p-6 shadow-lg">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">キャラクター画像をアップロード</h2>
        <Button
          variant="ghost"
          size="sm"
          @click="$emit('close')"
        >
          <Icon
            icon="material-symbols:close"
            class="h-4 w-4"
          />
        </Button>
      </div>

      <form
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <div class="space-y-2">
          <Label for="character">キャラクター名</Label>
          <Input
            id="character"
            v-model="form.character"
            placeholder="例: キャラクターA"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="cloth">服装</Label>
          <Input
            id="cloth"
            v-model="form.cloth"
            placeholder="例: 制服"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="expression">表情・シーン</Label>
          <Input
            id="expression"
            v-model="form.expression"
            placeholder="例: 表情通常"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="image">画像ファイル</Label>
          <FileUpload
            v-model="selectedFile"
            accept="image/*"
            :max-size="10 * 1024 * 1024"
            @file-selected="handleFileSelected"
            @error="handleFileError"
          />
        </div>

        <div
          v-if="previewUrl"
          class="space-y-2"
        >
          <Label>プレビュー</Label>
          <div class="border-border rounded-lg border p-4">
            <img
              :src="previewUrl"
              :alt="`${form.character}_${form.cloth}_${form.expression}`"
              class="mx-auto max-h-48 w-auto rounded"
            />
          </div>
        </div>

        <div
          v-if="error"
          class="text-destructive text-sm"
        >
          {{ error }}
        </div>

        <div class="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            @click="$emit('close')"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            :disabled="!canSubmit || isLoading"
          >
            <Icon
              v-if="isLoading"
              icon="material-symbols:loading"
              class="mr-2 h-4 w-4 animate-spin"
            />
            {{ isLoading ? 'アップロード中...' : 'アップロード' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import FileUpload from '~/components/molecules/FileUpload.vue'
import type { AttachedFile } from '~/types/chat'
import { useCharacterImages } from '~/composables/useCharacterImages'

interface UploadForm {
  character: string
  cloth: string
  expression: string
}

const emit = defineEmits<{
  close: []
  uploaded: [character: string, cloth: string, expression: string]
}>()

const { uploadImage, isLoading, error } = useCharacterImages()

const form = ref<UploadForm>({
  character: '',
  cloth: '',
  expression: '',
})

const selectedFile = ref<AttachedFile | null>(null)
const previewUrl = ref<string | null>(null)
const fileError = ref<string | null>(null)

const canSubmit = computed(() => {
  return form.value.character.trim() && form.value.cloth.trim() && form.value.expression.trim() && selectedFile.value && !fileError.value
})

const handleFileSelected = (file: AttachedFile) => {
  selectedFile.value = file
  fileError.value = null

  // プレビュー用のURLを作成
  if (file.data) {
    previewUrl.value = `data:${file.type};base64,${file.data}`
  }
}

const handleFileError = (error: string) => {
  fileError.value = error
  selectedFile.value = null
  previewUrl.value = null
}

const handleSubmit = async () => {
  if (!selectedFile.value || !canSubmit.value) return

  try {
    const success = await uploadImage(form.value.character.trim(), form.value.cloth.trim(), form.value.expression.trim(), selectedFile.value.data, selectedFile.value.type, selectedFile.value.size)

    if (success) {
      emit('uploaded', form.value.character, form.value.cloth, form.value.expression)
      // フォームをリセット
      form.value = {
        character: '',
        cloth: '',
        expression: '',
      }
      selectedFile.value = null
      previewUrl.value = null
      fileError.value = null
    }
  } catch (err) {
    console.error('アップロードエラー:', err)
  }
}

// エラーが発生した場合は表示
watch(error, (newError) => {
  if (newError) {
    console.error('アップロードエラー:', newError)
  }
})
</script>
