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
        </Button>

        <Button
          variant="secondary"
          @click="$emit('reset')"
        >
          <Icon
            icon="material-symbols:refresh"
            class="h-4 w-4"
          />
        </Button>

        <ProfileSelect
          :profiles="profiles"
          :selected-profile-id="selectedProfileId"
          @update:selected-profile-id="(value) => emit('update:selectedProfileId', value)"
        >
          <SelectValue
            class="justify-center"
            :placeholder="'プロファイルを選択'"
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
              ></div>
              <span class="truncate">{{ truncatedName ?? 'プロファイルを選択' }}</span>
            </div>
          </SelectValue>
        </ProfileSelect>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import ProfileSelect from './ProfileSelect.vue'
import { SelectValue } from '~/components/ui/select'
import type { SettingsProfile } from '~/types/settings'
import { truncateText } from '~/lib/format'

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

const truncatedName = computed(() => {
  return truncateText(selectedProfile.value?.name ?? '', 8)
})

const emit = defineEmits<{
  save: []
  reset: []
  'update:selectedProfileId': [value: string | null]
}>()

const selectedProfile = computed(() => {
  return props.profiles.find((profile) => profile.id === props.selectedProfileId) ?? null
})
</script>
