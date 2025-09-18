<template>
  <div class="space-y-4">
    <div
      class="flex items-start justify-end"
      :style="containerStyle"
    >
      <div
        class="message-bubble relative ml-2 border shadow-sm"
        :style="userBubbleStyle"
      >
        <div
          class="text-foreground"
          :style="messageContentStyle"
        >
          こんにちは！
        </div>
      </div>
      <Avatar
        v-if="avatarSettings.enabled"
        :style="avatarStyle"
        class="shrink-0"
      >
        <AvatarImage
          v-if="avatarSettings.defaultUserAvatar.imageUrl"
          :src="avatarSettings.defaultUserAvatar.imageUrl"
          alt="User avatar"
        />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </div>

    <div
      class="flex items-start"
      :style="containerStyle"
    >
      <Avatar
        v-if="avatarSettings.enabled"
        :style="avatarStyle"
        class="shrink-0"
      >
        <AvatarImage
          v-if="avatarSettings.defaultAssistantAvatar.imageUrl"
          :src="avatarSettings.defaultAssistantAvatar.imageUrl"
          alt="Assistant avatar"
        />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div
        class="message-bubble relative mr-2 border shadow-sm"
        :style="assistantBubbleStyle"
      >
        <div
          class="text-foreground"
          :style="messageContentStyle"
        >
          こんにちは！
          <br />
          これはアシスタントのメッセージプレビューです！
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'
import type { AvatarSettings } from '~/types/settings'
import { useSettingsStore } from '~/stores/settings'
import { hexToRgba } from '~/utils/color'
import { storeToRefs } from 'pinia'

interface Props {
  avatarSettings: AvatarSettings
}

const props = defineProps<Props>()

const settingsStore = useSettingsStore()
const { messageAppearanceSettings } = storeToRefs(settingsStore)

const containerStyle = computed(() => {
  if (!props.avatarSettings.enabled) {
    return {}
  }

  return {
    '--avatar-size': `${props.avatarSettings.size}px`,
    gap: '12px',
  }
})

const avatarStyle = computed(() => {
  return {
    width: `${props.avatarSettings.size}px`,
    height: `${props.avatarSettings.size}px`,
  }
})

const userBubbleStyle = computed(() => {
  const appearance = messageAppearanceSettings.value
  const baseColor = appearance.userBubbleColor
  return {
    fontFamily: appearance.fontFamily || 'var(--message-font-family)',
    backgroundColor: hexToRgba(baseColor, appearance.opacity),
    borderRadius: `${appearance.bubbleRadius}px`,
    padding: `${appearance.bubblePaddingY}px ${appearance.bubblePaddingX}px`,
    borderColor: hexToRgba(baseColor, 0.45),
    color: 'var(--foreground)',
  } as Record<string, string>
})

const assistantBubbleStyle = computed(() => {
  const appearance = messageAppearanceSettings.value
  const baseColor = appearance.assistantBubbleColor
  return {
    fontFamily: appearance.fontFamily || 'var(--message-font-family)',
    backgroundColor: hexToRgba(baseColor, appearance.opacity),
    borderRadius: `${appearance.bubbleRadius}px`,
    padding: `${appearance.bubblePaddingY}px ${appearance.bubblePaddingX}px`,
    borderColor: hexToRgba(baseColor, 0.35),
    color: 'var(--foreground)',
  } as Record<string, string>
})

const messageContentStyle = computed(() => ({
  fontSize: `${messageAppearanceSettings.value.messageFontSize}px`,
  lineHeight: 1.6,
}))
</script>

<style scoped>
.message-bubble {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  transform: translateZ(0);
  transition: all 0.2s ease;
}
</style>
