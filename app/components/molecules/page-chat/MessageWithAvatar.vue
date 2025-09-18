<template>
  <div
    :class="containerClasses"
    :style="containerStyle"
  >
    <!-- Assistant Avatar (Left Side) -->
    <Avatar
      v-if="shouldShowAvatar && !isUserMessage"
      :class="avatarClasses"
    >
      <AvatarImage
        v-if="avatarConfig.imageUrl"
        :src="avatarConfig.imageUrl"
        :alt="`${message.role} avatar`"
      />
      <AvatarFallback>{{ avatarConfig.fallbackText }}</AvatarFallback>
    </Avatar>

    <!-- Message Content -->
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
    >
      <AvatarImage
        v-if="avatarConfig.imageUrl"
        :src="avatarConfig.imageUrl"
        :alt="`${message.role} avatar`"
      />
      <AvatarFallback>{{ avatarConfig.fallbackText }}</AvatarFallback>
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
  return (
    systemConfig || {
      fallbackText: role === 'user' ? 'U' : 'AI',
    }
  )
})

const containerClasses = computed(() => {
  const baseClasses = ['flex', 'items-start']

  // アライメント設定
  if (settingsStore.avatarSettings.alignment === 'center') {
    baseClasses.push('items-center')
  } else {
    baseClasses.push('items-start')
  }

  return baseClasses.join(' ')
})

const containerStyle = computed(() => {
  if (!shouldShowAvatar.value) {
    return {}
  }

  return {
    '--avatar-size': getAvatarSize(),
    '--avatar-gap': `${settingsStore.avatarSettings.gap}px`,
    gap: 'var(--avatar-gap)',
  }
})

const avatarClasses = computed(() => {
  const sizeClass = getSizeClass()
  return ['shrink-0', sizeClass].join(' ')
})

const getAvatarSize = () => {
  const sizeMap = {
    sm: '1.5rem', // 24px
    md: '2rem', // 32px
    lg: '2.5rem', // 40px
    xl: '3rem', // 48px
  }
  return sizeMap[settingsStore.avatarSettings.size] || sizeMap.md
}

const getSizeClass = () => {
  const sizeMap = {
    sm: 'size-6', // 24px
    md: 'size-8', // 32px
    lg: 'size-10', // 40px
    xl: 'size-12', // 48px
  }
  return sizeMap[settingsStore.avatarSettings.size] || sizeMap.md
}
</script>

<style scoped>
.message-with-avatar {
  --avatar-size: 2rem;
  --avatar-gap: 0.75rem;
}
</style>
