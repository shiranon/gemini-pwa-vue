<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="max-w-4xl">
      <DialogHeader>
        <DialogTitle>使用関数設定</DialogTitle>
        <DialogDescription class="sr-only">このチャットセッション中のみ有効な関数設定を変更できます。実際の設定は変更されません。</DialogDescription>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Function Calling モード -->
        <div class="space-y-3">
          <Label class="text-base font-medium">関数呼び出しモード</Label>
          <RadioGroup
            :model-value="activeProfileSettings?.functionCallingMode"
            @update:model-value="
              (value: AcceptableValue) => {
                if (typeof value === 'string') updateProfileSetting('functionCallingMode', value as 'auto' | 'any' | 'none')
              }
            "
          >
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <RadioGroupItem
                  id="auto"
                  value="auto"
                />
                <Label
                  for="auto"
                  class="flex-1 cursor-pointer"
                >
                  <div class="font-medium">AUTO（自動）</div>
                </Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem
                  id="any"
                  value="any"
                />
                <Label
                  for="any"
                  class="flex-1 cursor-pointer"
                >
                  <div class="font-medium">ANY（強制関数呼び出し）</div>
                </Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem
                  id="none"
                  value="none"
                />
                <Label
                  for="none"
                  class="flex-1 cursor-pointer"
                >
                  <div class="font-medium">NONE</div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label class="text-base font-medium">利用するツール（{{ selectedCount }} / {{ toolOptions.length }}）</Label>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="selectAllTools"
              >
                全選択
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="clearAllTools"
              >
                全解除
              </Button>
            </div>
          </div>

          <div class="max-h-[300px] overflow-y-auto rounded-lg border p-4">
            <div class="grid grid-cols-1 gap-4">
              <div
                v-for="tool in toolOptions"
                :key="tool.name"
                class="space-y-2"
              >
                <div class="flex items-start space-x-2">
                  <Checkbox
                    :id="tool.name"
                    :model-value="selectedToolNameSet.has(tool.name)"
                    @update:model-value="(value: boolean | 'indeterminate') => handleToolToggle(tool.name, value === true)"
                  />
                  <div class="min-w-0 flex-1">
                    <Label
                      :for="tool.name"
                      class="cursor-pointer text-sm font-medium"
                    >
                      {{ tool.displayName }}
                    </Label>
                    <p class="text-muted-foreground mt-1 text-xs">
                      {{ tool.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="isOpen = false"
        >
          閉じる
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import type { AcceptableValue } from 'reka-ui'
import { useFunctionCalling } from '~/composables/useFunctionCalling'
import { useQuickActions } from '~/composables/useQuickActions'
import { computeNextEnabledFunctionTools } from '~/function-calling/selection'

const isOpen = ref(false)

const { getFunctionRegistryEntries } = useFunctionCalling()
const { updateProfileSetting, getActiveProfileSettings } = useQuickActions()

// アクティブプロファイルの設定を直接参照
const activeProfileSettings = computed(() => getActiveProfileSettings())

interface ToolOption {
  name: string
  displayName: string
  description: string
  tags: string[]
  argsHint?: string
  contextHint?: string
  defaultEnabled?: boolean
}

const toolOptions = computed<ToolOption[]>(() => {
  const entries = getFunctionRegistryEntries()
  return entries.map((item) => ({
    name: item.name,
    displayName: item.entry.meta?.displayName || item.name,
    description: item.entry.meta?.description || item.entry.declaration.description || '',
    tags: item.entry.meta?.tags ? [...item.entry.meta.tags] : [],
    argsHint: item.entry.meta?.argsHint,
    contextHint: item.entry.meta?.contextHint,
    defaultEnabled: item.entry.meta?.defaultEnabled,
  }))
})

const selectedToolNameSet = computed(() => {
  const enabledTools = activeProfileSettings.value?.enabledFunctionTools || []
  return new Set(enabledTools)
})
const selectedCount = computed(() => activeProfileSettings.value?.enabledFunctionTools?.length || 0)

const handleToolToggle = (toolName: string, enabled: boolean) => {
  const orderedNames = toolOptions.value.map((tool) => tool.name)
  const currentSelection = activeProfileSettings.value?.enabledFunctionTools || []
  const nextSelection = computeNextEnabledFunctionTools(currentSelection, toolName, enabled, orderedNames)

  updateProfileSetting('enabledFunctionTools', nextSelection)
}

// updateProfileSettingはuseQuickActionsから取得済み

const selectAllTools = () => {
  const allNames = toolOptions.value.map((tool) => tool.name)
  updateProfileSetting('enabledFunctionTools', allNames)
}

const clearAllTools = () => {
  updateProfileSetting('enabledFunctionTools', [])
}

const open = () => {
  isOpen.value = true
}

defineExpose({
  open,
})
</script>
