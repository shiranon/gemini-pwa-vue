<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import type { NotificationSoundRecord } from '~/types/database'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import { logger } from '~/lib/logger'

const props = defineProps<{
  modelValue: {
    enableReplySound: boolean
    replySoundId?: string
  }
  showConfirm: (message: string, title?: string, description?: string) => Promise<boolean>
  showAlert: (message: string, description?: string) => void
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: { enableReplySound: boolean; replySoundId?: string }): void
}>()

const { addNotificationSound, deleteNotificationSound, getNotificationSounds, previewSound, previewDefaultSound } = useNotificationSound()

const sounds = ref<NotificationSoundRecord[]>([])
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const loadingVersion = ref(0)

const localSettings = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

onMounted(async () => {
  await loadSounds()
})

const loadSounds = async () => {
  // 新しいバージョンを設定（既存のリクエストを無効化）
  const currentVersion = ++loadingVersion.value

  try {
    const result = await getNotificationSounds()
    // 最新のリクエストの場合のみ更新
    if (currentVersion === loadingVersion.value) {
      sounds.value = result
    }
  } catch (error) {
    // 最新のリクエストの場合のみエラーログを記録
    if (currentVersion === loadingVersion.value) {
      logger.error('通知音の読み込みに失敗しました', { component: 'NotificationSoundSection', error })
      throw error
    }
  }
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 音声ファイルかチェック
  if (!file.type.startsWith('audio/')) {
    props.showAlert('音声ファイルを選択してください')
    return
  }

  // ファイルサイズチェック（5MB以下）
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    props.showAlert('ファイルサイズが大きすぎます（5MB以下にしてください）')
    return
  }

  isUploading.value = true
  try {
    await addNotificationSound(file)
    await loadSounds()
  } catch (error) {
    logger.error('通知音のアップロードに失敗しました', { component: 'NotificationSoundSection', error })
    props.showAlert('音声ファイルのアップロードに失敗しました')
  } finally {
    isUploading.value = false
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

const handleDelete = async (id: string) => {
  const confirmed = await props.showConfirm('この通知音を削除しますか？', '通知音の削除')
  if (!confirmed) return

  try {
    await deleteNotificationSound(id)
    await loadSounds()
  } catch (error) {
    logger.error('通知音の削除に失敗しました', { component: 'NotificationSoundSection', error })
    props.showAlert('通知音の削除に失敗しました')
  }
}

const handlePreview = async (id?: string) => {
  if (id) {
    await previewSound(id)
  } else {
    await previewDefaultSound()
  }
}

const selectSound = (id?: string) => {
  emit('update:modelValue', {
    ...localSettings.value,
    replySoundId: id,
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
</script>

<template>
  <div class="space-y-4">
    <!-- 通知音有効化トグル -->
    <SettingToggle
      :model-value="localSettings.enableReplySound"
      label="通知音"
      description="アシスタントの新規返信時に通知音を再生"
      @update:model-value="(value: boolean) => (localSettings = { ...localSettings, enableReplySound: value })"
    />

    <!-- 通知音が有効な場合のみ表示 -->
    <div
      v-if="localSettings.enableReplySound"
      class="space-y-4 border-l-2 border-gray-200 pl-4"
    >
      <!-- デフォルト音声 -->
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-gray-700">通知音の選択</h4>

        <div
          class="flex cursor-pointer items-center justify-between rounded-lg border-2 bg-gray-50 p-3 transition-all hover:bg-gray-100"
          :class="!localSettings.replySoundId ? 'border-blue-500' : 'border-gray-200'"
          @click="selectSound(undefined)"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-4 w-4 items-center justify-center rounded-full border-2"
              :class="!localSettings.replySoundId ? 'border-blue-500' : 'border-gray-300'"
            >
              <div
                v-if="!localSettings.replySoundId"
                class="h-2 w-2 rounded-full bg-blue-500"
              />
            </div>
            <span class="text-sm font-medium">デフォルト音声</span>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 transition-colors hover:bg-gray-200"
            @click.stop="handlePreview()"
          >
            <Icon
              icon="material-symbols:play-arrow"
              class="h-5 w-5 text-gray-600"
            />
          </button>
        </div>
      </div>

      <!-- カスタム音声一覧 -->
      <div
        v-if="sounds.length > 0"
        class="space-y-2"
      >
        <div
          v-for="sound in sounds"
          :key="sound.id"
          class="flex cursor-pointer items-center justify-between rounded-lg border-2 bg-white p-3 transition-all hover:bg-gray-50"
          :class="localSettings.replySoundId === sound.id ? 'border-blue-500' : 'border-gray-200'"
          @click="selectSound(sound.id)"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div
              class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2"
              :class="localSettings.replySoundId === sound.id ? 'border-blue-500' : 'border-gray-300'"
            >
              <div
                v-if="localSettings.replySoundId === sound.id"
                class="h-2 w-2 rounded-full bg-blue-500"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {{ sound.name }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatFileSize(sound.size) }}
              </p>
            </div>
          </div>
          <div class="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              class="rounded-lg p-2 transition-colors hover:bg-gray-200"
              @click.stop="handlePreview(sound.id)"
            >
              <Icon
                icon="material-symbols:play-arrow"
                class="h-5 w-5 text-gray-600"
              />
            </button>
            <button
              type="button"
              class="rounded-lg p-2 transition-colors hover:bg-red-100"
              @click.stop="handleDelete(sound.id)"
            >
              <Icon
                icon="material-symbols:delete-outline"
                class="h-5 w-5 text-red-600"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- 音声アップロードボタン -->
      <div>
        <input
          ref="fileInputRef"
          type="file"
          accept="audio/*"
          class="hidden"
          @change="handleFileSelect"
        />
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isUploading"
          @click="fileInputRef?.click()"
        >
          <Icon
            :icon="isUploading ? 'material-symbols:progress-activity' : 'material-symbols:add'"
            class="h-5 w-5"
            :class="{ 'animate-spin': isUploading }"
          />
          <span class="text-sm font-medium">
            {{ isUploading ? 'アップロード中...' : 'カスタム音声を追加' }}
          </span>
        </button>
        <p class="mt-2 text-xs text-gray-500">対応形式: MP3, WAV, OGG など（5MB以下）</p>
      </div>
    </div>
  </div>
</template>
