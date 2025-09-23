<template>
  <div>
    <ProfileCard
      :profiles="profiles"
      :model-value="selectedProfileId"
      @update:model-value="handleProfileChange"
      @edit="handleEdit"
      @create="handleCreateNew"
      @delete="handleDelete"
      @export="handleExport"
      @import="handleImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ProfileCard from './ProfileCard.vue'
import type { SettingsProfile } from '~/types/settings'

const props = defineProps<{
  profiles: SettingsProfile[]
  activeProfileId: string | null
}>()

const emit = defineEmits<{
  select: [profileId: string]
  create: []
  edit: [profileId: string]
  delete: [profileId: string]
  export: [profileId: string]
  import: []
}>()

const selectedProfileId = ref<string | null>(props.activeProfileId ?? null)

watch(
  () => props.activeProfileId,
  (value) => {
    selectedProfileId.value = value ?? null
  }
)

watch(
  () => props.profiles,
  (profiles) => {
    if (!profiles?.length) {
      selectedProfileId.value = null
      return
    }
    const hasCurrent = profiles.some((profile) => profile.id === selectedProfileId.value)
    if (!hasCurrent) {
      const hasActive = profiles.some((profile) => profile.id === props.activeProfileId)
      selectedProfileId.value = hasActive ? props.activeProfileId : null
    }
  }
)

const handleProfileChange = (profileId: string | null) => {
  if (!profileId) {
    selectedProfileId.value = null
    return
  }
  if (selectedProfileId.value !== profileId) {
    selectedProfileId.value = profileId
  }
  emit('select', profileId)
}

const handleCreateNew = () => {
  emit('create')
}

const handleEdit = (profileId: string) => {
  emit('edit', profileId)
}

const handleDelete = (profileId: string) => {
  emit('delete', profileId)
}

const handleExport = (profileId: string) => {
  emit('export', profileId)
}

const handleImport = () => {
  emit('import')
}
</script>
