<template>
  <div>
    <ProfileCard
      :profiles="profiles"
      :model-value="selectedProfileId"
      @update:model-value="handleProfileChange"
      @edit="handleEditProfile"
      @create="handleCreateProfile"
      @delete="handleDeleteProfile"
      @export="handleExportProfile"
      @import="handleImportProfile"
      @update-profile-image="handleUpdateProfileImage"
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
  'update-profile-image': [profileId: string, imageUrl: string | null]
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

const handleCreateProfile = () => {
  emit('create')
}

const handleEditProfile = (profileId: string) => {
  emit('edit', profileId)
}

const handleDeleteProfile = (profileId: string) => {
  emit('delete', profileId)
}

const handleExportProfile = (profileId: string) => {
  emit('export', profileId)
}

const handleImportProfile = () => {
  emit('import')
}

const handleUpdateProfileImage = (profileId: string, imageUrl: string | null) => {
  emit('update-profile-image', profileId, imageUrl)
}
</script>
