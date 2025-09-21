<template>
  <header class="border-border bg-card/95 text-card-foreground supports-[backdrop-filter]:bg-card/80 sticky top-0 z-20 border-b shadow-sm backdrop-blur">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
      <AppLogo :title="pageTitle" />

      <div
        v-if="currentPage === 'chat'"
        class="flex w-full justify-end pr-6"
      >
        <Button
          variant="outline"
          size="default"
          class="rounded-sm"
          @click="$emit('new-chat')"
        >
          <Icon
            icon="material-symbols:add"
            class="h-6 w-6"
          />
        </Button>
      </div>
      <DesktopNavigation
        :current-page="currentPage"
        @navigate="$emit('navigate', $event)"
      />

      <Button
        variant="ghost"
        size="sm"
        class="md:hidden"
        @click="$emit('toggle-mobile-menu')"
      >
        <Icon
          :icon="showMobileMenu ? 'material-symbols:close' : 'material-symbols:menu'"
          class="h-6 w-6"
        />
      </Button>
    </div>

    <MobileNavigation
      :current-page="currentPage"
      :is-visible="showMobileMenu"
      @navigate="$emit('navigate-mobile', $event)"
    />
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Button from '~/components/ui/button/Button.vue'
import AppLogo from '~/components/molecules/AppLogo.vue'
import DesktopNavigation from '~/components/molecules/DesktopNavigation.vue'
import MobileNavigation from '~/components/molecules/MobileNavigation.vue'

interface Props {
  currentPage: string
  pageTitle: string
  showMobileMenu: boolean
}

defineProps<Props>()
defineEmits<{
  navigate: [page: string]
  'navigate-mobile': [page: string]
  'toggle-mobile-menu': []
  'new-chat': []
}>()
</script>
