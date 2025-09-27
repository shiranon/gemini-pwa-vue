<template>
  <div class="border-border/70 bg-card text-card-foreground flex flex-col gap-5 rounded-2xl border px-4 py-5 shadow-sm md:px-6">
    <div class="flex flex-col items-start gap-5">
      <div class="flex flex-1 items-start justify-start gap-4">
        <div class="flex flex-col items-center gap-2">
          <div
            class="bg-muted/60 text-muted-foreground border-border/60 group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border"
            @click="handleImageUpload"
          >
            <img
              v-if="selectedProfile?.settings.profileImage"
              :src="selectedProfile.settings.profileImage"
              :alt="selectedProfile.name"
              class="h-full w-full object-cover"
            />
            <Icon
              v-else
              icon="material-symbols:account-circle"
              class="h-9 w-9"
            />
            <div class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon
                icon="material-symbols:camera-alt"
                class="h-5 w-5 text-white"
              />
            </div>
          </div>
        </div>
        <div class="flex-1 items-start justify-start">
          <p class="text-muted-foreground/80 text-xs">設定プロファイル</p>
          <div class="flex items-start gap-2">
            <p class="text-foreground hidden text-lg font-semibold sm:block">
              {{ truncatedName ?? '新規プロファイル' }}
            </p>
            <p class="text-foreground block text-lg font-semibold sm:hidden">
              {{ selectedProfile?.name ?? '新規プロファイル' }}
            </p>
            <span
              v-if="selectedProfile?.isDefault"
              class="bg-primary/10 text-foreground/80 mt-0.5 rounded-full px-2 py-0.5 text-[10px]"
            >
              デフォルト
            </span>
            <Button
              type="button"
              class="text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:text-muted-foreground/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white transition disabled:cursor-not-allowed"
              :disabled="selectedProfile?.isDefault"
              @click.stop="handleEditProfile"
            >
              <Icon
                icon="material-symbols:edit"
                class="h-4 w-4"
              />
            </Button>
          </div>
          <p
            v-if="selectedProfile?.settings.modelName"
            class="text-muted-foreground mt-1 text-xs"
          >
            {{ selectedProfile.settings.modelName }}
          </p>
          <p
            v-else
            class="text-muted-foreground mt-1 text-xs"
          >
            プロファイルを選択するか新規保存してください
          </p>
          <p
            v-if="selectedProfile?.description"
            class="text-muted-foreground/80 mt-1 text-[11px]"
          >
            {{ selectedProfile.description }}
          </p>
        </div>
        <Button
          v-if="selectedProfile?.settings.profileImage"
          variant="outline"
          size="sm"
          class="h-7 px-2 text-xs"
          @click.stop="handleRemoveImage"
        >
          画像を削除
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        @click="handleCreateProfile"
      >
        <Icon
          icon="material-symbols:person-add"
          class="h-5 w-5"
        />
        新規保存
      </Button>

      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        :disabled="!selectedProfile || selectedProfile.isDefault"
        @click="handleDeleteProfile"
      >
        <Icon
          icon="material-symbols:person-remove"
          class="h-5 w-5"
        />
        削除
      </Button>

      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        :disabled="!selectedProfile"
        @click="handleExportProfile"
      >
        <Icon
          icon="material-symbols:upload"
          class="h-5 w-5"
        />
        出力
      </Button>

      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        @click="handleImportProfile"
      >
        <Icon
          icon="material-symbols:download"
          class="h-5 w-5"
        />
        取込
      </Button>
      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        :disabled="!selectedProfile"
        @click="handleResetProfile"
      >
        <Icon
          icon="material-symbols:refresh"
          class="h-5 w-5"
        />
        リセット
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { SettingsProfile } from '~/types/settings'
import { truncateText } from '~/lib/format'
import { useProfileImageUpload } from '~/composables/useImageUpload'
import { PROFILE_NAME_MAX_LENGTH } from '~/constants/constants'

const props = defineProps<{
  profiles: SettingsProfile[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  edit: [profileId: string]
  create: []
  delete: [profileId: string]
  reset: [profileId: string]
  export: [profileId: string]
  import: []
  'update-profile-image': [profileId: string, imageUrl: string | null]
}>()

const selectedId = ref<string | null>(props.modelValue ?? null)

// プロファイル画像用のアップローダー
const profileImageUploader = useProfileImageUpload()

watch(
  () => props.modelValue,
  (value) => {
    selectedId.value = value ?? null
  }
)

watch(
  () => props.profiles,
  (profiles) => {
    if (!profiles?.length) {
      if (selectedId.value !== null) {
        selectedId.value = null
        emit('update:modelValue', null)
      }
      return
    }

    const exists = profiles.some((profile) => profile.id === selectedId.value)
    if (!exists) {
      const modelValueExists = profiles.some((profile) => profile.id === props.modelValue)
      if (modelValueExists) {
        const nextValue = props.modelValue
        if (selectedId.value !== nextValue) {
          selectedId.value = nextValue
          emit('update:modelValue', nextValue)
        }
        return
      }
      const defaultProfile = profiles.find((profile) => profile.isDefault)
      const nextValue = defaultProfile?.id ?? null
      if (selectedId.value !== nextValue) {
        selectedId.value = nextValue
        emit('update:modelValue', nextValue)
      }
    }
  }
)

const selectedProfile = computed(() => {
  return props.profiles.find((profile) => profile.id === selectedId.value) ?? null
})

const truncatedName = computed(() => truncateText(selectedProfile.value?.name ?? '', PROFILE_NAME_MAX_LENGTH))

const handleEditProfile = () => {
  if (selectedId.value) {
    emit('edit', selectedId.value)
  }
}

const handleCreateProfile = () => {
  emit('create')
}

const handleDeleteProfile = () => {
  if (selectedId.value && !selectedProfile.value?.isDefault) {
    emit('delete', selectedId.value)
  }
}

const handleResetProfile = () => {
  if (selectedId.value) {
    emit('reset', selectedId.value)
  }
}

const handleExportProfile = () => {
  if (selectedId.value) {
    emit('export', selectedId.value)
  }
}

const handleImportProfile = () => {
  emit('import')
}

const handleImageUpload = async () => {
  if (!selectedProfile.value) return

  const imageUrl = await profileImageUploader.selectFile()
  if (imageUrl) {
    emit('update-profile-image', selectedProfile.value.id, imageUrl)
  } else if (profileImageUploader.error.value) {
    alert(profileImageUploader.error.value)
  }
}

const handleRemoveImage = () => {
  if (!selectedProfile.value) return

  // 確認ダイアログを表示
  if (confirm('プロフィール画像を削除しますか？')) {
    emit('update-profile-image', selectedProfile.value.id, null)
  }
}
</script>
