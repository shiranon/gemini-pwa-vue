<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>プロファイル切り替え</DialogTitle>
        <DialogDescription>使用するプロファイルを選択してください</DialogDescription>
      </DialogHeader>
      <div class="max-h-[400px] overflow-y-auto px-1">
        <RadioGroup
          :model-value="currentProfileId"
          @update:model-value="handleProfileChange"
        >
          <div class="space-y-2">
            <div
              v-for="profile in profiles"
              :key="profile.id"
              class="flex items-center space-x-2"
            >
              <RadioGroupItem :value="profile.id" />
              <Label
                :for="profile.id"
                class="flex-1 cursor-pointer"
              >
                <div class="font-medium">{{ profile.name }}</div>
                <div class="text-muted-foreground text-sm">{{ profile.description || 'デフォルトプロファイル' }}</div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>
      <DialogFooter>
        <DialogClose as-child>
          <Button variant="outline"> 閉じる </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import type { AcceptableValue } from 'reka-ui'
import { useSettingsStore } from '~/stores/settings'
import { logger } from '~/lib/logger'

const isOpen = ref(false)
const settingsStore = useSettingsStore()

const currentProfileId = computed(() => settingsStore.settings.currentProfileId || 'default')

const profiles = computed(() => {
  const defaultProfile = {
    id: 'default',
    name: 'デフォルト',
    description: '標準のプロファイル',
  }

  const customProfiles = (settingsStore.settings.styleProfiles || []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    description: profile.description || '',
  }))

  return [defaultProfile, ...customProfiles]
})

const handleProfileChange = (profileId: AcceptableValue) => {
  if (typeof profileId !== 'string') return
  settingsStore.updateSettings({ currentProfileId: profileId })
  logger.info(`[Profile Switch] プロファイルが切り替えられました: ${profileId}`, { component: 'ProfileSwitchModal' })
}

const open = () => {
  isOpen.value = true
}

defineExpose({
  open,
})
</script>
