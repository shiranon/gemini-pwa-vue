<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>チャットのインポート</DialogTitle>
        <DialogDescription> エクスポートしたJSONファイルを選択してください </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div
          class="border-border hover:border-primary/40 rounded-lg border-2 border-dashed p-6 text-center transition-colors"
          @drop="handleDrop"
          @dragover.prevent
          @dragenter.prevent
        >
          <Icon
            icon="material-symbols:upload"
            class="text-muted-foreground mx-auto mb-2 h-8 w-8"
          />
          <p class="text-muted-foreground text-sm">ファイルをドラッグ&ドロップするか、クリックして選択</p>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            class="hidden"
            @change="handleFileSelect"
          />
          <Button
            variant="outline"
            size="sm"
            class="mt-2"
            @click="fileInput?.click()"
          >
            ファイルを選択
          </Button>
        </div>

        <div
          v-if="selectedFile"
          class="bg-muted rounded-lg p-3"
        >
          <div class="flex items-center gap-2">
            <Icon
              icon="material-symbols:description"
              class="text-primary h-4 w-4"
            />
            <span class="text-sm font-medium">{{ selectedFile.name }}</span>
            <Button
              variant="ghost"
              size="sm"
              class="ml-auto h-6 w-6 p-0"
              @click="clearFile"
            >
              <Icon
                icon="material-symbols:close"
                class="h-4 w-4"
              />
            </Button>
          </div>
          <p class="text-muted-foreground mt-1 text-xs">
            {{ formatFileSize(selectedFile.size) }}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleCancel"
        >
          キャンセル
        </Button>
        <Button
          :disabled="!selectedFile || importing"
          @click="handleImport"
        >
          <Icon
            v-if="importing"
            icon="material-symbols:sync"
            class="mr-2 h-4 w-4 animate-spin"
          />
          {{ importing ? 'インポート中...' : 'インポート' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'

interface Props {
  open?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'import', file: File): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const importing = ref(false)

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file && file.type === 'application/json') {
    selectedFile.value = file
  }
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

const handleImport = async () => {
  if (!selectedFile.value) return

  importing.value = true
  try {
    emit('import', selectedFile.value)
    clearFile()
    isOpen.value = false
  } finally {
    importing.value = false
  }
}

const handleCancel = () => {
  clearFile()
  emit('cancel')
  isOpen.value = false
}
</script>
