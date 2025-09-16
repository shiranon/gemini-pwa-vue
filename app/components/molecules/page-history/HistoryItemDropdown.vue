<template>
  <div class="relative">
    <Button
      variant="ghost"
      size="sm"
      title="その他のアクション"
      @click="showDropdown = !showDropdown"
    >
      <Icon icon="material-symbols:more-vert" />
    </Button>

    <div
      v-if="showDropdown"
      v-click-outside="closeDropdown"
      class="border-border bg-card text-card-foreground absolute top-full right-0 z-20 min-w-40 rounded-lg border py-2 shadow-2xl shadow-[0_30px_50px_rgba(15,23,42,0.12)]"
    >
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start gap-3"
        @click="handleToggleArchive"
      >
        <Icon
          v-if="chat.isArchived"
          icon="material-symbols:unarchive"
        />
        <Icon
          v-else
          icon="material-symbols:archive"
        />
        {{ chat.isArchived ? 'アーカイブを解除' : 'アーカイブ' }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start gap-3"
        @click="handleExport"
      >
        <Icon icon="material-symbols:download" />
        エクスポート
      </Button>

      <div class="bg-border my-2 h-px"></div>

      <Button
        variant="ghost"
        size="sm"
        class="text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start gap-3"
        @click="handleDelete"
      >
        <Icon icon="material-symbols:delete" />
        削除
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import type { ChatSession } from '~/types/chat'
import { vClickOutside } from '~/composables/useClickOutside'

interface Props {
  chat: ChatSession
}

defineProps<Props>()

const emit = defineEmits<{
  'toggle-archive': []
  'export-chat': []
  'delete-chat': []
}>()

const showDropdown = ref(false)

const closeDropdown = () => {
  showDropdown.value = false
}

const handleToggleArchive = () => {
  emit('toggle-archive')
  closeDropdown()
}

const handleExport = () => {
  emit('export-chat')
  closeDropdown()
}

const handleDelete = () => {
  emit('delete-chat')
  closeDropdown()
}
</script>
