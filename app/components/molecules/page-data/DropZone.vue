<template>
  <Card>
    <CardContent class="p-0">
      <div
        class="border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/25 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all md:p-12"
        :class="{ 'border-primary bg-primary/5': dragOver }"
        @drop="handleFileDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @click="openFileDialog"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="opacity-60">
            <Icon
              icon="material-symbols:upload"
              class="text-muted-foreground h-12 w-12"
            />
          </div>
          <div class="max-w-xs">
            <p class="text-lg font-medium">バックアップファイルをドロップ</p>
            <p class="text-muted-foreground mt-1 text-sm">またはクリックしてファイルを選択</p>
          </div>
          <div class="flex gap-2">
            <Badge variant="secondary">JSON</Badge>
          </div>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleFileSelect"
      />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

const dragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

const emit = defineEmits<{
  'file-selected': [file: File]
}>()

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file) {
      emit('file-selected', file)
    }
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    if (file) {
      emit('file-selected', file)
    }
  }
}

function openFileDialog() {
  fileInput.value?.click()
}
</script>
