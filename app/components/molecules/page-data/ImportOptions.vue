<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-sm">インポートオプション</CardTitle>
      <CardDescription class="text-xs"> インポートするデータを選択してください </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="space-y-3">
        <Label class="text-sm font-medium">インポートするデータ</Label>
        <div class="space-y-2">
          <div class="flex items-center space-x-2">
            <Checkbox
              :id="'import-chats'"
              :checked="options.importChats"
              @update:checked="(checked: boolean | 'indeterminate') => updateOptions('importChats', checked)"
            />
            <Label
              :for="'import-chats'"
              class="cursor-pointer text-sm font-normal"
            >
              チャットデータをインポート
            </Label>
          </div>

          <div class="flex items-center space-x-2">
            <Checkbox
              :id="'import-settings'"
              :checked="options.importSettings"
              @update:checked="(checked: boolean | 'indeterminate') => updateOptions('importSettings', checked)"
            />
            <Label
              :for="'import-settings'"
              class="cursor-pointer text-sm font-normal"
            >
              設定をインポート
            </Label>
          </div>

          <Separator />

          <div class="flex items-center space-x-2">
            <Checkbox
              :id="'replace-existing'"
              :checked="options.replaceExisting"
              @update:checked="(checked: boolean | 'indeterminate') => updateOptions('replaceExisting', checked)"
            />
            <Label
              :for="'replace-existing'"
              class="text-destructive cursor-pointer text-sm font-normal"
            >
              既存データを置換（注意）
            </Label>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'

interface ImportOptions {
  importChats: boolean
  importSettings: boolean
  replaceExisting: boolean
}

interface Props {
  options: ImportOptions
}

defineProps<Props>()

const emit = defineEmits<{
  'update-options': [key: keyof ImportOptions, value: boolean]
}>()

function updateOptions(key: keyof ImportOptions, value: boolean | 'indeterminate') {
  const booleanValue = value === true
  emit('update-options', key, booleanValue)
}
</script>
