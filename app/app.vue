<script setup lang="ts">
import { onMounted } from 'vue'
import { Toaster } from '~/components/ui/sonner'
import 'vue-sonner/style.css'
import { logger } from '~/utils/logger'

const settingsStore = useSettingsStore()

onMounted(async () => {
  try {
    await settingsStore.initialize()
  } catch (error) {
    logger.error('[SettingsStore] 初期化に失敗しました:', { component: 'app' }, error)
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
