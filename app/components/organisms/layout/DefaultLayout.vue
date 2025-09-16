<template>
  <div class="bg-background text-foreground flex min-h-screen flex-col">
    <AppHeader
      :current-page="currentPage"
      :page-title="pageTitle"
      :show-mobile-menu="showMobileMenu"
      @navigate="navigateTo"
      @navigate-mobile="
        (page) => {
          navigateTo(page)
          closeMobileMenu()
        }
      "
      @toggle-mobile-menu="toggleMobileMenu"
    />

    <main class="flex flex-1 flex-col">
      <slot />
    </main>

    <ClientOnly>
      <PWANotification
        v-if="offlineReady || needRefresh"
        type="update"
        :message="offlineReady ? 'オフラインで利用可能です' : '新しいバージョンが利用可能です'"
        :show-primary-action="!!needRefresh"
        primary-action-label="更新"
        secondary-action-label="閉じる"
        @primary-action="updateServiceWorker()"
        @secondary-action="cancelPrompt()"
      />

      <PWANotification
        v-if="showInstallPrompt && !offlineReady && !needRefresh"
        type="install"
        message="このアプリをインストールできます"
        primary-action-label="インストール"
        secondary-action-label="キャンセル"
        @primary-action="install()"
        @secondary-action="cancelInstall()"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useNavigation } from '~/composables/useNavigation'
import { useMobileMenu } from '~/composables/useMobileMenu'
import AppHeader from '~/components/molecules/layout/AppHeader.vue'
import PWANotification from '~/components/molecules/layout/PWANotification.vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { onMounted, onBeforeUnmount, ref } from 'vue'

const { currentPage, pageTitle, navigateTo } = useNavigation()

const { showMobileMenu, toggleMobileMenu, closeMobileMenu } = useMobileMenu()

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
})

function cancelPrompt() {
  offlineReady.value = false
  needRefresh.value = false
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const showInstallPrompt = ref(false)
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null

function beforeInstallPromptHandler(e: BeforeInstallPromptEvent) {
  e.preventDefault()
  deferredInstallPrompt = e
  showInstallPrompt.value = true
}

async function install() {
  if (!deferredInstallPrompt) return
  await deferredInstallPrompt.prompt()
  try {
    await deferredInstallPrompt.userChoice
  } finally {
    showInstallPrompt.value = false
    deferredInstallPrompt = null
  }
}

function cancelInstall() {
  showInstallPrompt.value = false
  deferredInstallPrompt = null
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler as EventListener)
})
</script>
