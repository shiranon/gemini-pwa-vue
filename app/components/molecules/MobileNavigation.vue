<template>
  <nav
    v-show="isVisible"
    class="border-border mx-auto flex w-full max-w-7xl flex-col gap-2 border-t p-4"
  >
    <Button
      :variant="currentPage === 'chat' ? 'secondary' : 'ghost'"
      class="flex w-full items-center justify-start gap-3 px-4 py-3 text-left"
      @click="$emit('navigate', 'chat')"
    >
      <Icon icon="material-symbols:chat" />
      <span>チャット</span>
    </Button>

    <Button
      :variant="currentPage === 'data' ? 'secondary' : 'ghost'"
      class="flex w-full items-center justify-start gap-3 px-4 py-3 text-left"
      @click="$emit('navigate', 'data')"
    >
      <Icon icon="material-symbols:data-object" />
      <span>データ</span>
    </Button>

    <Button
      :variant="currentPage === 'history' ? 'secondary' : 'ghost'"
      class="flex w-full items-center justify-start gap-3 px-4 py-3 text-left"
      @click="$emit('navigate', 'history')"
    >
      <Icon icon="material-symbols:schedule" />
      <span>履歴</span>
    </Button>

    <Button
      :variant="currentPage === 'image' ? 'secondary' : 'ghost'"
      class="flex w-full items-center justify-start gap-3 px-4 py-3 text-left"
      @click="$emit('navigate', 'image')"
    >
      <Icon icon="material-symbols:image" />
      <span>画像</span>
    </Button>

    <Button
      :variant="currentPage === 'settings' ? 'secondary' : 'ghost'"
      class="flex w-full items-center justify-start gap-3 px-4 py-3 text-left"
      @click="$emit('navigate', 'settings')"
    >
      <Icon icon="material-symbols:settings" />
      <span>設定</span>
    </Button>
  </nav>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'

interface Props {
  currentPage: string
  isVisible: boolean
}

defineProps<Props>()
defineEmits<{
  navigate: [page: string]
}>()
</script>
