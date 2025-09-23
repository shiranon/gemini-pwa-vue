<template>
  <div class="border-border/60 bg-card/95 text-card-foreground supports-[backdrop-filter]:bg-card/80 sticky top-18 z-10 rounded-2xl border p-6 shadow-md backdrop-blur">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-foreground text-xl font-bold">設定</h1>

      <div class="flex items-center gap-2">
        <Button
          v-if="isDirty"
          variant="default"
          :disabled="saving"
          @click="$emit('save')"
        >
          <Icon
            v-if="saving"
            icon="material-symbols:refresh"
            class="h-4 w-4 animate-spin"
          />
          <Icon
            v-else
            icon="material-symbols:save"
            class="h-4 w-4"
          />
          {{ saving ? '保存中...' : '設定を保存' }}
        </Button>

        <Button
          variant="secondary"
          @click="$emit('reset')"
        >
          <Icon
            icon="material-symbols:refresh"
            class="h-4 w-4"
          />
          リセット
        </Button>

        <div class="min-w-48">
          <Select
            :model-value="selectedProfileId"
            @update:model-value="handleProfileChange"
          >
            <SelectTrigger
              class="border-border/60 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 bg-background h-10 w-full rounded-xl border px-3 py-2 text-sm transition focus:ring-2 focus:outline-none"
              :disabled="!profiles.length"
            >
              <SelectValue
                class="justify-center"
                :placeholder="'プロファイルを選択'"
              >
                {{ selectedProfile?.name ?? 'プロファイルを選択' }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent class="mr-6">
              <SelectGroup>
                <SelectLabel class="text-xs">利用可能なプロファイル</SelectLabel>
                <SelectItem
                  v-for="profile in profiles"
                  :key="profile.id"
                  :value="profile.id"
                  class="cursor-pointer py-2"
                >
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ profile.name }}</span>
                      <span
                        v-if="profile.isDefault"
                        class="bg-muted/70 text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
                      >
                        デフォルト
                      </span>
                    </div>
                    <span
                      v-if="profile.description"
                      class="text-muted-foreground/80 truncate text-[11px]"
                    >
                      {{ profile.description }}
                    </span>
                    <span
                      v-if="profile.settings.modelName"
                      class="text-muted-foreground/70 text-[11px]"
                    >
                      {{ profile.settings.modelName }}
                    </span>
                  </div>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AcceptableValue } from 'reka-ui'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { SettingsProfile } from '~/types/settings'

export interface SettingsHeaderProps {
  /** 変更があるかどうか */
  isDirty: boolean
  /** 保存中かどうか */
  saving?: boolean
  /** プロファイル一覧 */
  profiles: SettingsProfile[]
  /** 選択中のプロファイルID */
  selectedProfileId: string | null
}

const props = withDefaults(defineProps<SettingsHeaderProps>(), {
  saving: false,
})

const emit = defineEmits<{
  save: []
  reset: []
  'update:selectedProfileId': [value: string | null]
}>()

const selectedProfile = computed(() => {
  return props.profiles.find((profile) => profile.id === props.selectedProfileId) ?? null
})

const handleProfileChange = (value: AcceptableValue) => {
  if (value === null || value === undefined) {
    emit('update:selectedProfileId', null)
    return
  }

  const profileId = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  if (!profileId || profileId === 'null' || profileId === 'undefined') {
    emit('update:selectedProfileId', null)
    return
  }

  emit('update:selectedProfileId', profileId)
}
</script>
