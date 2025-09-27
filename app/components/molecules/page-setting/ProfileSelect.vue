<template>
  <div class="w-auto max-w-48">
    <Select
      :model-value="selectedProfileId"
      @update:model-value="handleProfileChange"
    >
      <SelectTrigger
        class="border-border/60 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 bg-background h-10 w-full rounded-xl border px-3 py-2 text-sm transition focus:ring-2 focus:outline-none"
        :disabled="!profiles.length"
      >
        <slot>
          <SelectValue
            class="justify-center"
            :placeholder="placeholder"
          >
            <div class="flex items-center gap-2">
              <div
                v-if="selectedProfile?.settings.profileImage"
                class="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
              >
                <img
                  :src="selectedProfile.settings.profileImage"
                  :alt="selectedProfile.name"
                  class="h-full w-full object-cover"
                />
              </div>
              <div
                v-else
                class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500"
              >
                <span class="text-xs font-medium text-white">
                  {{ selectedProfile?.name?.charAt(0)?.toUpperCase() ?? '?' }}
                </span>
              </div>
              <span class="truncate">{{ selectedProfile?.name ?? placeholder }}</span>
            </div>
          </SelectValue>
        </slot>
      </SelectTrigger>
      <SelectContent class="mr-6">
        <SelectGroup>
          <SelectLabel class="text-xs">{{ label }}</SelectLabel>
          <SelectItem
            v-for="profile in profiles"
            :key="profile.id"
            :value="profile.id"
            class="cursor-pointer py-2"
          >
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <div
                  v-if="profile.settings.profileImage"
                  class="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full"
                >
                  <img
                    :src="profile.settings.profileImage"
                    :alt="profile.name"
                    class="h-full w-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500"
                >
                  <span class="text-[10px] font-medium text-white">
                    {{ profile.name?.charAt(0)?.toUpperCase() ?? '?' }}
                  </span>
                </div>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AcceptableValue } from 'reka-ui'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { SettingsProfile } from '~/types/settings'

export interface ProfileSelectProps {
  /** プロファイル一覧 */
  profiles: SettingsProfile[]
  /** 選択中のプロファイルID */
  selectedProfileId: string | null
  /** プレースホルダーテキスト */
  placeholder?: string
  /** ラベルテキスト */
  label?: string
}

const props = withDefaults(defineProps<ProfileSelectProps>(), {
  placeholder: 'プロファイルを選択',
  label: '利用可能なプロファイル',
})

const emit = defineEmits<{
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
