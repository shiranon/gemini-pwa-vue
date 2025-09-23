<template>
  <Dialog v-model="isOpen">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon
            :icon="isEditMode ? 'material-symbols:edit' : 'material-symbols:add'"
            class="h-5 w-5"
          />
          {{ isEditMode ? 'プロファイルを編集' : '新規プロファイルの作成' }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground">
          {{
            isEditMode
              ? 'プロファイルの名前と説明を変更できます。設定内容は変更されません。'
              : '新しい設定プロファイルを作成します。現在の設定をベースにするか、デフォルト設定から始めるかを選択できます。'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <div class="space-y-3">
          <Label
            for="profile-name"
            class="text-sm font-medium"
          >
            プロファイル名 <span class="text-destructive">*</span>
          </Label>
          <Input
            id="profile-name"
            v-model="formData.name"
            placeholder="例: 開発用設定、本番環境、テスト環境"
            class="bg-background"
            :class="!formData.name.trim() && 'border-destructive/50'"
          />
          <p class="text-muted-foreground text-xs">プロファイルを識別するための名前を入力してください</p>
        </div>

        <div class="space-y-3">
          <Label
            for="profile-description"
            class="text-sm font-medium"
          >
            説明（オプション）
          </Label>
          <Textarea
            id="profile-description"
            v-model="formData.description"
            placeholder="このプロファイルの用途や特徴を記載してください（例: 開発時に使用する設定、API キーやモデル設定を含む）"
            rows="3"
            class="bg-background resize-none"
          />
          <p class="text-muted-foreground text-xs">プロファイルの用途や内容を説明します</p>
        </div>

        <div
          v-if="!isEditMode"
          class="space-y-3"
        >
          <Label class="text-sm font-medium">設定の初期値</Label>
          <div class="bg-muted/30 space-y-3 rounded-lg border p-4">
            <div class="flex items-start space-x-3">
              <Checkbox
                id="copy-current"
                v-model:checked="copyCurrentSettings"
              />
              <div class="space-y-1">
                <Label
                  for="copy-current"
                  class="cursor-pointer text-sm font-medium"
                >
                  現在の設定をコピーする（推奨）
                </Label>
                <p class="text-muted-foreground text-xs">現在使用中の設定（APIキー、モデル、プロンプトなど）をこのプロファイルにコピーします</p>
              </div>
            </div>
            <div
              v-if="!copyCurrentSettings"
              class="bg-background ml-6 rounded border border-dashed p-3"
            >
              <p class="text-muted-foreground text-xs">チェックを外すとデフォルト設定から開始します。後で個別に設定を調整してください。</p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button
          variant="outline"
          @click="handleCancel"
        >
          <Icon
            icon="material-symbols:close"
            class="mr-2 h-4 w-4"
          />
          キャンセル
        </Button>
        <Button
          :disabled="!formData.name.trim()"
          @click="handleSave"
        >
          <Icon
            :icon="isEditMode ? 'material-symbols:save' : 'material-symbols:add'"
            class="mr-2 h-4 w-4"
          />
          {{ isEditMode ? '更新する' : '作成する' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import type { SettingsProfile } from '~/types/settings'

const props = defineProps<{
  modelValue: boolean
  profile?: SettingsProfile | null
  mode: 'create' | 'edit'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: { name: string; description: string; copyCurrentSettings: boolean }]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isEditMode = computed(() => props.mode === 'edit')

const formData = ref({
  name: '',
  description: '',
})

const copyCurrentSettings = ref(true)

watch(
  () => props.profile,
  (profile) => {
    if (profile && isEditMode.value) {
      formData.value = {
        name: profile.name,
        description: profile.description || '',
      }
    } else {
      formData.value = {
        name: '',
        description: '',
      }
    }
  },
  { immediate: true }
)

const handleSave = () => {
  if (formData.value.name.trim()) {
    emit('save', {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      copyCurrentSettings: !isEditMode.value && copyCurrentSettings.value,
    })
    isOpen.value = false
  }
}

const handleCancel = () => {
  isOpen.value = false
}
</script>
