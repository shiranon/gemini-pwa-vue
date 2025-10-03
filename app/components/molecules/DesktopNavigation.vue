<template>
  <nav class="hidden gap-2 md:flex">
    <Button
      variant="ghost"
      size="default"
      :class="['justify-start gap-2', currentPage === 'chat' && 'bg-accent text-accent-foreground']"
      @click="$emit('navigate', 'chat')"
    >
      <Icon icon="material-symbols:chat" />
      <span>チャット</span>
    </Button>

    <Button
      variant="ghost"
      size="default"
      :class="['justify-start gap-2', currentPage === 'data' && 'bg-accent text-accent-foreground']"
      @click="$emit('navigate', 'data')"
    >
      <Icon icon="material-symbols:data-object" />
      <span>データ</span>
    </Button>

    <Button
      variant="ghost"
      size="default"
      :class="['justify-start gap-2', currentPage === 'history' && 'bg-accent text-accent-foreground']"
      @click="$emit('navigate', 'history')"
    >
      <Icon icon="material-symbols:schedule" />
      <span>履歴</span>
    </Button>

    <Button
      variant="ghost"
      size="default"
      :class="['justify-start gap-2', currentPage === 'image' && 'bg-accent text-accent-foreground']"
      @click="$emit('navigate', 'image')"
    >
      <Icon icon="material-symbols:image" />
      <span>画像</span>
    </Button>

    <Button
      variant="ghost"
      size="default"
      :class="['justify-start gap-2', currentPage === 'settings' && 'bg-accent text-accent-foreground']"
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
}

defineProps<Props>()
defineEmits<{
  navigate: [page: string]
}>()
</script>
