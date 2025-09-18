<template>
  <div
    :style="containerStyle"
    class="flex items-start"
  >
    <Avatar
      v-if="shouldShowAvatar && !isUserMessage"
      :class="avatarClasses"
      :style="avatarStyle"
    >
      <AvatarImage
        v-if="avatarConfig.imageUrl"
        :src="avatarConfig.imageUrl"
        :alt="`${message.role} avatar`"
      />
      <AvatarFallback>{{ message.role === 'user' ? 'U' : 'AI' }}</AvatarFallback>
    </Avatar>

    <div class="min-w-0 flex-1">
      <MessageBubble
        :message="message"
        :options="options"
        :enable-markdown="enableMarkdown"
        v-bind="$attrs"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @copy="$emit('copy', $event)"
        @retry="$emit('retry', $event)"
      />
    </div>

    <!-- User Avatar (Right Side) -->
    <Avatar
      v-if="shouldShowAvatar && isUserMessage"
      :class="avatarClasses"
      :style="avatarStyle"
    >
      <AvatarImage
        v-if="avatarConfig.imageUrl"
        :src="avatarConfig.imageUrl"
        :alt="`${message.role} avatar`"
      />
      <AvatarFallback>{{ message.role === 'user' ? 'U' : 'AI' }}</AvatarFallback>
    </Avatar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage, MessageBubbleOptions } from '~/types/chat'
import type { ChatAvatarSettings, AvatarConfig } from '~/types/settings'
import { useSettingsStore } from '~/stores/settings'
import MessageBubble from './MessageBubble.vue'
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'

interface Props {
  message: ChatMessage
  options?: Partial<MessageBubbleOptions>
  enableMarkdown?: boolean
  chatAvatarSettings?: ChatAvatarSettings
}

const props = withDefaults(defineProps<Props>(), {
  enableMarkdown: true,
})

defineEmits<{
  edit: [message: ChatMessage]
  delete: [message: ChatMessage]
  copy: [message: ChatMessage]
  retry: [message: ChatMessage]
}>()

const settingsStore = useSettingsStore()

const isUserMessage = computed(() => props.message.role === 'user')

const shouldShowAvatar = computed(() => {
  return settingsStore.avatarSettings.enabled
})

const avatarConfig = computed((): AvatarConfig => {
  const role = props.message.role

  // 1. チャット個別設定（優先度最高）
  if (props.chatAvatarSettings) {
    const chatConfig = role === 'user' ? props.chatAvatarSettings.userAvatar : props.chatAvatarSettings.assistantAvatar

    if (chatConfig) {
      return chatConfig
    }
  }

  // 2. システムデフォルト設定
  const systemConfig = role === 'user' ? settingsStore.avatarSettings.defaultUserAvatar : settingsStore.avatarSettings.defaultAssistantAvatar

  // 3. ハードコードされたフォールバック
  return systemConfig || {}
})

const containerStyle = computed(() => {
  if (!shouldShowAvatar.value) {
    return {}
  }

  return {
    '--avatar-size': `${settingsStore.avatarSettings.size}px`,
    gap: '12px', // 固定の間隔
  }
})

const avatarClasses = computed(() => {
  return 'shrink-0 mt-2'
})

const avatarStyle = computed(() => {
  return {
    width: `${settingsStore.avatarSettings.size}px`,
    height: `${settingsStore.avatarSettings.size}px`,
  }
})
</script>

<style scoped>
.message-with-avatar {
  --avatar-size: 2rem;
  --avatar-gap: 0.75rem;
}
</style>
