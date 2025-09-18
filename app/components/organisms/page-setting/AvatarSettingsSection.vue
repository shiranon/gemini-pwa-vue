<template>
  <SettingSection
    title="アイコン設定"
    description="メッセージアイコンの表示設定とアバター画像"
    single-column
  >
    <div class="space-y-6">
      <SettingToggle
        :model-value="localSettings.enabled"
        label="アイコン表示"
        description="メッセージにアイコンを表示する"
        @update:model-value="(value: boolean) => updateLocalSetting('enabled', value)"
      />

      <SettingItem
        label="アイコンサイズ"
        standalone
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Slider
            :model-value="[avatarSize]"
            :min="10"
            :max="150"
            :step="1"
            class="flex-1"
            @update:model-value="(value?: number[]) => updateAvatarSize(value?.[0] ?? avatarSize)"
          />
          <Input
            :model-value="avatarSize"
            type="number"
            class="w-24"
            :min="10"
            :max="150"
            @update:model-value="(value: string | number | null) => updateAvatarSize(typeof value === 'number' ? value : Number(value))"
          />
          <span class="text-muted-foreground text-sm">px</span>
        </div>
      </SettingItem>

      <SettingItem
        label="ユーザーアイコン"
        standalone
      >
        <div class="space-y-2">
          <div
            v-if="userAvatarPreview"
            class="flex items-center gap-4"
          >
            <img
              :src="userAvatarPreview"
              alt="User avatar"
              class="h-16 w-16 rounded-full object-cover"
            />
            <Button
              variant="outline"
              size="sm"
              @click="clearUserAvatar"
            >
              <Icon
                icon="material-symbols:close"
                class="mr-1 h-4 w-4"
              />
              削除
            </Button>
          </div>
          <Input
            v-else
            type="file"
            accept="image/*"
            @change="onUserAvatarUpload"
          />
          <p class="text-muted-foreground text-xs">対応形式: PNG, JPG, GIF, WebP</p>
        </div>
      </SettingItem>

      <SettingItem
        label="アシスタントアイコン"
        standalone
      >
        <div class="space-y-2">
          <div
            v-if="assistantAvatarPreview"
            class="flex items-center gap-4"
          >
            <img
              :src="assistantAvatarPreview"
              alt="Assistant avatar"
              class="h-16 w-16 rounded-full object-cover"
            />
            <Button
              variant="outline"
              size="sm"
              @click="clearAssistantAvatar"
            >
              <Icon
                icon="material-symbols:close"
                class="mr-1 h-4 w-4"
              />
              削除
            </Button>
          </div>
          <Input
            v-else
            type="file"
            accept="image/*"
            @change="onAssistantAvatarUpload"
          />
          <p class="text-muted-foreground text-xs">対応形式: PNG, JPG, GIF, WebP</p>
        </div>
      </SettingItem>

      <SettingItem
        label="プレビュー"
        standalone
      >
        <AvatarPreview :avatar-settings="avatarPreviewSettings" />
      </SettingItem>
    </div>
  </SettingSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import SettingSection from '~/components/molecules/page-setting/SettingSection.vue'
import SettingItem from '~/components/molecules/page-setting/SettingItem.vue'
import SettingToggle from '~/components/molecules/page-setting/SettingToggle.vue'
import AvatarPreview from '~/components/molecules/page-chat/AvatarPreview.vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Slider } from '~/components/ui/slider'
import type { AppSettings } from '~/types/settings'
import { clamp } from '~/utils/calc'

interface Props {
  localSettings: AppSettings
  updateLocalSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const props = defineProps<Props>()

const avatarSize = computed(() => props.localSettings.size)

// プレビュー用のdata URL
const userAvatarPreview = computed(() => props.localSettings.defaultUserAvatar.imageUrl)
const assistantAvatarPreview = computed(() => props.localSettings.defaultAssistantAvatar.imageUrl)

// プレビュー用の設定
const avatarPreviewSettings = computed(() => ({
  enabled: props.localSettings.enabled, // 実際の設定に連動
  size: props.localSettings.size,
  defaultUserAvatar: props.localSettings.defaultUserAvatar,
  defaultAssistantAvatar: props.localSettings.defaultAssistantAvatar,
}))

const updateAvatarSize = (value: number) => {
  const clamped = clamp(Number(value) || props.localSettings.size, 10, 150)
  props.updateLocalSetting('size', clamped)
}

// ファイルアップロード処理
const onUserAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_IMAGE_SIZE) {
      alert('画像ファイルが大きすぎます。5MB以下のファイルを選択してください。')
      target.value = ''
      return
    }

    // 画像をdata URLに変換
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const avatar = { ...props.localSettings.defaultUserAvatar, imageUrl: dataUrl }
      props.updateLocalSetting('defaultUserAvatar', avatar)
    }
    reader.readAsDataURL(file)
  } catch (error) {
    alert(error instanceof Error ? error.message : '画像の読み込みに失敗しました')
  }
}

const onAssistantAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_IMAGE_SIZE) {
      alert('画像ファイルが大きすぎます。5MB以下のファイルを選択してください。')
      target.value = ''
      return
    }

    // 画像をdata URLに変換
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const avatar = { ...props.localSettings.defaultAssistantAvatar, imageUrl: dataUrl }
      props.updateLocalSetting('defaultAssistantAvatar', avatar)
    }
    reader.readAsDataURL(file)
  } catch (error) {
    alert(error instanceof Error ? error.message : '画像の読み込みに失敗しました')
  }
}

// 画像削除処理
const clearUserAvatar = () => {
  const avatar = { ...props.localSettings.defaultUserAvatar }
  delete avatar.imageUrl
  props.updateLocalSetting('defaultUserAvatar', avatar)
}

const clearAssistantAvatar = () => {
  const avatar = { ...props.localSettings.defaultAssistantAvatar }
  delete avatar.imageUrl
  props.updateLocalSetting('defaultAssistantAvatar', avatar)
}
</script>
