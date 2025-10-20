<script setup lang="ts">
import { onMounted } from 'vue'
import { Toaster } from '~/components/ui/sonner'
import 'vue-sonner/style.css'
import { logger } from '~/lib/logger'

const settingsStore = useSettingsStore()
const profilesStore = useSettingsProfilesStore()

onMounted(async () => {
  try {
    await Promise.all([settingsStore.initialize(), profilesStore.initialize()])
  } catch (error) {
    logger.error('[Stores] 初期化に失敗しました:', { component: 'app' }, error)
  }
})
</script>

<template>
  <div>
    <NuxtPwaAssets />
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster
      position="top-right"
      rich-colors
      :duration="6000"
    />
  </div>
</template>
