<template>
  <div class="mx-auto mb-8 w-full max-w-5xl flex-1 items-center justify-between px-4">
    <SettingsHeader
      :is-dirty="globalIsDirty || profileIsDirty"
      :saving="globalSaving || profileSaving"
      :profiles="profiles"
      :selected-profile-id="activeProfileId"
      @save="handleSave"
      @reset="resetToDefaults"
      @update:selected-profile-id="(value) => value && handleSelectProfile(value)"
    />

    <ProfileSelector
      class="mt-4"
      :profiles="profiles"
      :active-profile-id="activeProfileId"
      @select="handleSelectProfile"
      @create="handleCreateProfile"
      @edit="handleEditProfile"
      @delete="handleDeleteProfile"
      @export="handleExportProfile"
      @import="handleImportProfile"
      @update-profile-image="handleUpdateProfileImage"
    />

    <Form
      :validation-schema="settingsFormSchemaTyped"
      :initial-values="localSettings"
      @submit="onSubmit"
    >
      <div class="mt-4 space-y-6">
        <ApiSettingsSection
          :local-settings="localSettings as AppSettings"
          :local-profile-settings="localProfileSettings as SettingsProfileData"
          @update-setting="handleUpdateSetting"
          @update-profile-setting="handleUpdateProfileSetting"
        />

        <PerformanceSettingsSection
          :local-settings="localSettings as AppSettings"
          :local-profile-settings="localProfileSettings as SettingsProfileData"
          @update-setting="handleUpdateSetting"
          @update-profile-setting="handleUpdateProfileSetting"
        />

        <DummyPromptSettingsSection
          :local-settings="localSettings as AppSettings"
          :local-profile-settings="localProfileSettings as SettingsProfileData"
          @update-setting="handleUpdateSetting"
          @update-profile-setting="handleUpdateProfileSetting"
        />

        <FeatureSettingsSection
          :local-settings="localSettings as AppSettings"
          :local-profile-settings="localProfileSettings as SettingsProfileData"
          @update-setting="handleUpdateSetting"
          @update-profile-setting="handleUpdateProfileSetting"
        />

        <ThemeSettingsSection
          :local-settings="localSettings as AppSettings"
          :update-local-setting="updateLocalSetting"
        />

        <FunctionCallingSettingsSection
          :local-settings="localSettings as AppSettings"
          :local-profile-settings="localProfileSettings as SettingsProfileData"
          @update-setting="handleUpdateSetting"
          @update-profile-setting="handleUpdateProfileSetting"
        />

        <UiSettingsSection
          :local-settings="localSettings as AppSettings"
          :update-local-setting="updateLocalSetting"
        />

        <AvatarSettingsSection
          :local-settings="localSettings as AppSettings"
          :update-local-setting="updateLocalSetting"
        />

        <BackgroundImageSettingsSection
          :local-settings="localSettings as AppSettings"
          @update-setting="handleUpdateSetting"
        />

        <ThoughtTranslationSettingsSection :local-settings="localSettings as AppSettings" />

        <ProofreadingSettingsSection :local-settings="localSettings as AppSettings" />

        <AdvancedSettingsSection :local-settings="localSettings as AppSettings" />

        <div
          v-if="lastSavedAt"
          class="border-border bg-muted text-foreground rounded-lg border p-4"
        >
          <div class="text-muted-foreground flex items-center gap-2 text-sm">
            <Icon
              icon="material-symbols:check"
              class="text-primary h-4 w-4"
            />
            最終保存: {{ formatLastSaved }}
          </div>
        </div>
      </div>
    </Form>

    <AlertDialog
      v-model="isAlertDialogOpen"
      :title="alertTitle"
      :message="alertMessage"
      @ok="handleAlertOk"
    />

    <ConfirmDialog
      v-model="isConfirmDialogOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      @confirm="handleConfirmOk"
      @cancel="handleConfirmCancel"
    />

    <ProfileDialog
      v-model="profileDialogOpen"
      :profile="editingProfile"
      :mode="profileDialogMode"
      @save="handleSaveProfile"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Form } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import AlertDialog from '~/components/molecules/dialogs/AlertDialog.vue'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import SettingsHeader from '~/components/molecules/page-setting/SettingsHeader.vue'
import ProfileDialog from '~/components/molecules/page-setting/ProfileDialog.vue'
import ProfileSelector from '~/components/molecules/page-setting/ProfileSelector.vue'
import ApiSettingsSection from '~/components/organisms/page-setting/ApiSettingsSection.vue'
import PerformanceSettingsSection from '~/components/organisms/page-setting/PerformanceSettingsSection.vue'
import ThoughtTranslationSettingsSection from '~/components/organisms/page-setting/ThoughtTranslationSettingsSection.vue'
import ProofreadingSettingsSection from '~/components/organisms/page-setting/ProofreadingSettingsSection.vue'
import FeatureSettingsSection from '~/components/organisms/page-setting/FeatureSettingsSection.vue'
import FunctionCallingSettingsSection from '~/components/organisms/page-setting/FunctionCallingSettingsSection.vue'
import ThemeSettingsSection from '~/components/organisms/page-setting/ThemeSettingsSection.vue'
import UiSettingsSection from '~/components/organisms/page-setting/UiSettingsSection.vue'
import AvatarSettingsSection from '~/components/organisms/page-setting/AvatarSettingsSection.vue'
import AdvancedSettingsSection from '~/components/organisms/page-setting/AdvancedSettingsSection.vue'
import DummyPromptSettingsSection from '~/components/organisms/page-setting/DummyPromptSettingsSection.vue'
import BackgroundImageSettingsSection from '~/components/organisms/page-setting/BackgroundImageSettingsSection.vue'
import { settingsFormSchema, type SettingsFormData } from '~/lib/validation'
import type { AppSettings, SettingsProfileData } from '~/types/settings'
import { DEFAULT_SETTINGS } from '~/types/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import { useSettingsStore } from '~/stores/settings'
import { useSettings } from '~/composables/useSettings'
import { useProfileSettings } from '~/composables/useProfileSettings'
import { logger } from '~/utils/logger'

// ダイアログの状態管理
const isAlertDialogOpen = ref(false)
const isConfirmDialogOpen = ref(false)
const alertTitle = ref('')
const alertMessage = ref('')
const alertDescription = ref('')
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmDescription = ref('')
const confirmResolve = ref<((value: boolean) => void) | null>(null)

// ダイアログ表示関数
const showAlert = (message: string, title = '', description = '') => {
  alertTitle.value = title
  alertMessage.value = message
  alertDescription.value = description
  isAlertDialogOpen.value = true
}

const showConfirm = (message: string, title = '確認', description = ''): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmTitle.value = title
    confirmMessage.value = message
    confirmDescription.value = description
    confirmResolve.value = resolve
    isConfirmDialogOpen.value = true
  })
}

// ダイアログハンドラー
const handleAlertOk = () => {
  alertTitle.value = ''
  alertMessage.value = ''
}

const handleConfirmOk = () => {
  if (confirmResolve.value) {
    confirmResolve.value(true)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
  confirmDescription.value = ''
}

const handleConfirmCancel = () => {
  if (confirmResolve.value) {
    confirmResolve.value(false)
    confirmResolve.value = null
  }
  confirmTitle.value = ''
  confirmMessage.value = ''
  confirmDescription.value = ''
}

// useSettings()にダイアログ関数を渡す（グローバル設定用）
const {
  localSettings,
  saving: globalSaving,
  isDirty: globalIsDirty,
  lastSavedAt,
  formatLastSaved,
  saveSettings,
  resetToDefaults,
  syncLocalSettings,
  updateLocalSetting,
} = useSettings({ showAlert, showConfirm })

// useProfileSettings()（プロファイル設定用）
const { localProfileSettings, saving: profileSaving, isDirty: profileIsDirty, hasActiveProfile, updateSetting: updateProfileSetting, saveProfileSettings } = useProfileSettings()

// 設定値更新ハンドラー
const handleUpdateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  updateLocalSetting(key, value)
}

// プロファイル設定更新ハンドラー
const handleUpdateProfileSetting = (key: keyof SettingsProfileData, value: SettingsProfileData[keyof SettingsProfileData]) => {
  updateProfileSetting(key, value)
}

const settingsFormSchemaTyped = toTypedSchema(settingsFormSchema)

// フォーム送信ハンドラー
const onSubmit = async (values: SettingsFormData) => {
  logger.info('設定フォームを送信:', values)
  await saveSettings()
}

// 保存ボタンのハンドラー
const handleSave = async () => {
  // グローバル設定とプロファイル設定の両方を保存
  const promises = []

  if (globalIsDirty.value) {
    promises.push(saveSettings())
  }

  if (profileIsDirty.value && hasActiveProfile.value) {
    promises.push(saveProfileSettings())
  }

  if (promises.length > 0) {
    await Promise.all(promises)
  }
}

// プロファイル管理
const profilesStore = useSettingsProfilesStore()
const profiles = computed(() => profilesStore.sortedProfiles)
const activeProfileId = computed(() => profilesStore.activeProfileId)

const profileDialogOpen = ref(false)
const profileDialogMode = ref<'create' | 'edit'>('create')
const editingProfile = ref<import('~/types/settings').SettingsProfile | null>(null)

const handleSelectProfile = (profileId: string) => {
  // プロファイルを切り替えるだけ（保存はしない）
  profilesStore.applyProfileToSettings(profileId)
  // ローカル設定を更新して表示を切り替える
  syncLocalSettings()
  // プロファイル設定も自動的に読み込まれる（useProfileSettingsのwatchで）
}

const handleCreateProfile = () => {
  profileDialogMode.value = 'create'
  editingProfile.value = null
  profileDialogOpen.value = true
}

const handleEditProfile = (profileId: string) => {
  const profile = profiles.value.find((p) => p.id === profileId)
  if (profile) {
    profileDialogMode.value = 'edit'
    editingProfile.value = profile
    profileDialogOpen.value = true
  }
}

const handleDeleteProfile = async (profileId: string) => {
  const confirmed = await showConfirm('このプロファイルを削除してもよろしいですか？', 'プロファイルの削除')
  if (confirmed) {
    await profilesStore.deleteProfile(profileId)
  }
}

const handleExportProfile = async (profileId: string) => {
  try {
    const jsonData = profilesStore.exportProfile(profileId)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const profile = profiles.value.find((p) => p.id === profileId)
    a.href = url
    a.download = `profile-${profile?.name || 'export'}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    showAlert('エクスポートに失敗しました', 'エラー')
  }
}

const handleUpdateProfileImage = async (profileId: string, imageUrl: string | null) => {
  await profilesStore.updateProfileImage(profileId, imageUrl)
}

const handleImportProfile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const jsonData = event.target?.result as string
          await profilesStore.importProfile(jsonData)
          showAlert('プロファイルをインポートしました')
        } catch {
          showAlert('インポートに失敗しました', 'エラー')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const handleSaveProfile = async (data: { name: string; description: string; copyCurrentSettings: boolean }) => {
  if (profileDialogMode.value === 'edit' && editingProfile.value) {
    await profilesStore.updateProfile(editingProfile.value.id, {
      name: data.name,
      description: data.description,
    })
  } else {
    console.log('handleSaveProfile', data.copyCurrentSettings)
    const settingsStore = useSettingsStore()
    const settings = data.copyCurrentSettings ? settingsStore.settings : DEFAULT_SETTINGS
    const newProfile = await profilesStore.createProfile(data.name, data.description, settings)
    await handleSelectProfile(newProfile.id)
  }
  profileDialogOpen.value = false
}

// ライフサイクル
onMounted(async () => {
  // settingsStoreの初期化を待つ
  const settingsStore = useSettingsStore()
  await settingsStore.initialize()

  // プロファイルストアの初期化
  await profilesStore.initialize()

  // 初期化後にlocalSettingsを同期
  syncLocalSettings()

  logger.info('設定ページを初期化。ローカル設定:', { component: 'settings' }, localSettings.value)
})
</script>
