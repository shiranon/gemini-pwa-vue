<script setup lang="ts">
import { onMounted } from 'vue'
import { Toaster } from '~/components/ui/sonner'
import 'vue-sonner/style.css'

const settingsStore = useSettingsStore()

onMounted(async () => {
  try {
    await settingsStore.initialize()
  } catch (error) {
    console.error('[SettingsStore] 初期化に失敗しました:', error)
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
