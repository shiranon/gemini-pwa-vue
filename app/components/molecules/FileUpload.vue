<template>
  <div class="file-upload">
    <Button
      variant="outline"
      class="w-full justify-center"
      :disabled="disabled"
      @click="openFileSelector"
    >
      <Icon
        icon="material-symbols:attach-file"
        class="mr-2 h-5 w-5"
      />
      {{ selectedFile ? selectedFile.name : 'ファイルを選択' }}
    </Button>

    <input
      ref="fileInputRef"
      type="file"
      :accept="accept"
      class="hidden"
      @change="handleFileSelect"
    />

    <div
      v-if="error"
      class="text-destructive mt-2 flex items-center text-sm"
    >
      <Icon
        icon="material-symbols:error"
        class="text-destructive mr-1 h-4 w-4"
      />
      {{ error }}
    </div>

    <div
      v-if="selectedFile"
      class="text-muted-foreground mt-2 text-xs"
    >
      {{ formatFileSize(selectedFile.size) }}
      <span v-if="selectedFile.type">・{{ selectedFile.type }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { AttachedFile } from '~/types/chat'
import { convertFileToAttachedFile } from '~/lib/file'
import { formatFileSize } from '~/lib/format'

export interface FileUploadProps {
  modelValue?: AttachedFile | null
  accept?: string
  maxSize?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<FileUploadProps>(), {
  modelValue: null,
  accept: undefined,
  maxSize: undefined,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [file: AttachedFile | null]
  'file-selected': [file: AttachedFile]
  error: [error: string]
}>()

const fileInputRef: Ref<HTMLInputElement | null> = ref(null)
const error = ref('')

const selectedFile = computed(() => props.modelValue)

const selectFile = async (file: File) => {
  error.value = ''

  if (props.maxSize && file.size > props.maxSize) {
    error.value = `ファイルサイズが上限（${formatFileSize(props.maxSize)}）を超えています`
    emit('error', error.value)
    return
  }

  try {
    const attachedFile = await convertFileToAttachedFile(file)
    emit('update:modelValue', attachedFile)
    emit('file-selected', attachedFile)
  } catch {
    error.value = 'ファイルの処理に失敗しました'
    emit('error', error.value)
  }
}

const openFileSelector = () => {
  if (props.disabled) return
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const selectedFile = target.files[0]
    if (selectedFile) {
      selectFile(selectedFile)
    }
    target.value = ''
  }
}
</script>
