<template>
  <div class="mx-auto mb-8 w-full max-w-5xl flex-1 items-center justify-between px-4">
    <SettingsHeader
      :is-dirty="isDirty"
      :saving="saving"
      @save="handleSave"
      @reset="resetToDefaults"
    />

    <Form
      :validation-schema="settingsFormSchemaTyped"
      :initial-values="localSettings"
      @submit="onSubmit"
    >
      <div class="mt-4 space-y-6">
        <ApiSettingsSection :local-settings="localSettings" />

        <PerformanceSettingsSection
          :local-settings="localSettings"
          @update-setting="handleUpdateSetting"
        />

        <DummyPromptSettingsSection
          :local-settings="localSettings"
          @update-setting="handleUpdateSetting"
        />

        <FeatureSettingsSection
          :local-settings="localSettings"
          @update-setting="handleUpdateSetting"
        />

        <ThemeSettingsSection
          :local-settings="localSettings"
          :update-local-setting="updateLocalSetting"
        />

        <FunctionCallingSettingsSection
          :local-settings="localSettings"
          @update-setting="handleUpdateSetting"
        />

        <UiSettingsSection
          :local-settings="localSettings"
          :update-local-setting="updateLocalSetting"
        />

        <AvatarSettingsSection
          :local-settings="localSettings"
          :update-local-setting="updateLocalSetting"
        />

        <BackgroundImageSettingsSection
          :local-settings="localSettings"
          @update-setting="handleUpdateSetting"
        />

        <ThoughtTranslationSettingsSection :local-settings="localSettings" />

        <ProofreadingSettingsSection :local-settings="localSettings" />

        <AdvancedSettingsSection :local-settings="localSettings" />

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
import type { AppSettings } from '~/types/settings'

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

// useSettings()にダイアログ関数を渡す
const { localSettings, saving, isDirty, lastSavedAt, formatLastSaved, saveSettings, resetToDefaults, syncLocalSettings, updateLocalSetting } = useSettings({ showAlert, showConfirm })

// 設定値更新ハンドラー
const handleUpdateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  updateLocalSetting(key, value)
}

const settingsFormSchemaTyped = toTypedSchema(settingsFormSchema)

// フォーム送信ハンドラー
const onSubmit = async (values: SettingsFormData) => {
  logger.info('設定フォームを送信:', values)
  await saveSettings()
}

// 保存ボタンのハンドラー
const handleSave = async () => {
  await saveSettings()
}

// ライフサイクル
onMounted(async () => {
  // settingsStoreの初期化を待つ
  const settingsStore = useSettingsStore()
  await settingsStore.initialize()

  // 初期化後にlocalSettingsを同期
  syncLocalSettings()

  logger.info('設定ページを初期化。ローカル設定:', { component: 'settings' }, localSettings.value)
})
</script>
