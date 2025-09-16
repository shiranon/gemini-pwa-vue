<template>
  <div
    class="relative flex flex-col"
    :class="'h-[calc(100vh-80px)]'"
    :style="backgroundStyle"
  >
    <div
      v-if="backgroundUrl"
      class="pointer-events-none absolute inset-0 z-0"
      :style="{ backgroundColor: overlayColorStyle }"
    />

    <div
      ref="messageContainer"
      class="z-10 flex-1 space-y-6 overflow-y-auto p-4 pb-6"
    >
      <SystemPromptEditor />
      <MessageBubble
        v-for="(message, index) in messages"
        :key="`${message.timestamp}-${index}`"
        :message="message"
        :options="{
          showTimestamp: true,
          allowEdit: true,
          allowDelete: true,
          allowRetry: message.role === 'user',
        }"
        class="message-fade-in"
        @edit="handleMessageEdit"
        @delete="handleMessageDelete"
        @copy="handleMessageCopy"
        @retry="handleMessageRetry"
      />
    </div>

    <div class="border-border bg-background/90 sticky bottom-0 z-20 border-t p-4 shadow-lg backdrop-blur">
      <div class="flex gap-2">
        <textarea
          v-model="inputText"
          :disabled="isSending"
          placeholder="メッセージを入力..."
          class="border-input focus:border-primary focus:ring-primary min-h-[80px] flex-1 resize-none rounded-lg border p-4 text-lg focus:ring-2 focus:outline-none"
          @keydown="handleKeydown"
        />
        <Button
          :disabled="isSending || !inputText.trim()"
          class="px-6"
          @click="sendMessage"
        >
          {{ isSending ? '送信中...' : '送信' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import { useGeminiStore } from '~/stores/gemini'
import { scrollToBottom } from '~/lib/scroll'
import MessageBubble from '~/components/molecules/page-chat/MessageBubble.vue'
import SystemPromptEditor from '~/components/molecules/page-chat/SystemPromptEditor.vue'
import { Button } from '~/components/ui/button'
import { hexToRgba } from '~/utils/color'
import type { ApiError, ChatMessage, AttachedFile, UserMessage } from '~/types/chat'
import { toast } from 'vue-sonner'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const geminiStore = useGeminiStore()

const inputText = ref('')
const messageContainer = ref<HTMLElement>()
const backgroundUrl = ref<string | null>(null)

const backgroundStyle = computed(() => {
  if (!backgroundUrl.value) return {}
  return {
    backgroundImage: `url(${backgroundUrl.value})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  } as Record<string, string>
})

const overlayColorStyle = computed(() => {
  const hex = settingsStore.settings.overlayColor || '#000000'
  return hexToRgba(hex, settingsStore.settings.overlayOpacity)
})

const messages = computed(() => chatStore.currentMessages)
const isSending = computed(() => geminiStore.isSending)
const ERROR_TOAST_ID = 'gemini-error'

const dismissErrorToast = () => {
  toast.dismiss(ERROR_TOAST_ID)
}

const showErrorToast = (error: ApiError) => {
  const descriptionParts: string[] = []

  if (typeof error.details === 'string' && error.details.trim().length > 0) {
    descriptionParts.push(error.details.trim())
  }

  if (error.retrying && error.nextRetryDelayMs) {
    const attempt = error.attempt ?? 1
    const maxRetries = error.maxRetries ?? 0
    const seconds = Math.ceil(error.nextRetryDelayMs / 1000)
    if (maxRetries > 0) {
      descriptionParts.push(`自動再試行予定: ${seconds}秒後 (${attempt}/${maxRetries})`)
    } else {
      descriptionParts.push(`自動再試行予定: ${seconds}秒後`)
    }
  }

  toast.error(error.message, {
    id: ERROR_TOAST_ID,
    description: descriptionParts.join('\n') || undefined,
    action: error.retirable
      ? {
          label: '再試行',
          onClick: () => {
            chatStore.retryFromError()
          },
        }
      : undefined,
  })
}

const sendMessage = async (options?: { contentOverride?: string; skipAddingUserMessage?: boolean; attachmentsOverride?: AttachedFile[] }) => {
  const rawContent = options?.contentOverride ?? inputText.value
  const content = rawContent.trim()
  if (!content) return

  // 最新の設定を都度取得し、チャット固有システムプロンプトで上書き
  const settings = { ...settingsStore.apiSettings, systemPrompt: chatStore.systemPrompt }
  if (!settings.apiKey) {
    alert('APIキーを設定してください')
    return
  }

  if (options?.attachmentsOverride) {
    chatStore.clearInput()
    options.attachmentsOverride.forEach((file) => {
      chatStore.attachFile(file)
    })
  }

  chatStore.setInputText(content)

  try {
    // chatStore.sendMessageを使用してsaveOnSendを有効化
    const success = await chatStore.sendMessage({ skipAddingUserMessage: options?.skipAddingUserMessage })

    if (success) {
      inputText.value = ''

      // Gemini APIを呼び出し（チャット固有のシステムプロンプトを優先適用）
      await geminiStore.sendMessage(messages.value, settings, {
        onAssistantMessageStart: (_message: ChatMessage) => {
          chatStore.startStreaming()
          console.log('[ChatInterface] メッセージ作成を geminiStore に委譲')
          return -1
        },
        onAssistantMessageAdd: (message: ChatMessage) => {
          // ストリーミング時は重複防止のため何もしない
          // 非ストリーミング時のみメッセージ追加
          if (!settings.streamingOutput) {
            chatStore.addMessage({
              role: message.role,
              content: message.content,
              timestamp: message.timestamp || Date.now(),
              thoughts: message.thoughts,
              translatedThoughts: message.translatedThoughts,
              error: message.error,
              functionCalls: message.functionCalls,
              functionResults: message.functionResults,
            })
            // 非ストリーミング完了時にsaveOnResponseを実行
            chatStore.completeStreaming({
              functionCalls: message.functionCalls,
              functionResults: message.functionResults,
            })
          }
        },
        onMessageUpdate: (index: number, updates: Partial<ChatMessage>) => {
          chatStore.updateMessage(index, {
            content: updates.content,
            error: updates.error,
            thoughts: updates.thoughts,
            translatedThoughts: updates.translatedThoughts,
            functionCalls: updates.functionCalls,
            functionResults: updates.functionResults,
          })

          // ストリーミング完了の判断：明示的な完了フラグを使用
          // これにより、Function Call実行中の中間状態での保存を防ぐ
          if (updates.isStreamingComplete) {
            // ストリーミング完了時にsaveOnResponseを実行
            chatStore.completeStreaming({
              functionCalls: updates.functionCalls,
              functionResults: updates.functionResults,
            })
          }
        },
        onError: (error: ApiError | null) => {
          if (error) {
            chatStore.setError(error)
            showErrorToast(error)
          } else {
            chatStore.clearError()
            dismissErrorToast()
          }
        },
      })
    }
  } catch (error) {
    console.error('Message sending error:', error)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const clearChat = () => {
  chatStore.resetCurrentChat()
}

const handleMessageEdit = async (editedMessage: ChatMessage) => {
  // MessageBubbleから編集されたメッセージを受け取り、ChatStoreで更新
  // timestampを使用してvisibleMessagesから元のメッセージを特定
  const originalMessage = chatStore.visibleMessages.find((m) => m.createdAt === editedMessage.timestamp)
  if (originalMessage) {
    await chatStore.editMessage(originalMessage.id, editedMessage.content)
  }
}

const handleMessageDelete = async (messageToDelete: ChatMessage) => {
  // MessageBubbleから削除対象のメッセージを受け取り、ChatStoreで削除
  // timestampを使用してvisibleMessagesから元のメッセージを特定
  const originalMessage = chatStore.visibleMessages.find((m) => m.createdAt === messageToDelete.timestamp)
  console.log(originalMessage?.id)
  if (originalMessage) {
    await chatStore.deleteMessage(originalMessage.id)
  }
}

const handleMessageCopy = (copiedMessage: ChatMessage) => {
  // コピー完了の通知（必要に応じてトーストなどを表示）
  console.log('Message copied to clipboard:', copiedMessage.content)
}

const handleMessageRetry = async (messageToRetry: ChatMessage) => {
  if (isSending.value) return
  if (messageToRetry.role !== 'user') return

  const originalMessage = chatStore.visibleMessages.find((m) => m.createdAt === messageToRetry.timestamp && m.role === 'user') as UserMessage | undefined
  const attachments = originalMessage?.attachments ? [...originalMessage.attachments] : undefined

  await sendMessage({
    contentOverride: originalMessage?.content ?? messageToRetry.content,
    skipAddingUserMessage: true,
    attachmentsOverride: attachments,
  })
}

const scrollToBottomInternal = () => {
  if (messageContainer.value) {
    scrollToBottom(messageContainer.value)
  }
}

// 新しいメッセージが追加されたら自動スクロール
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      scrollToBottomInternal()
    })
  }
)

onMounted(() => {
  scrollToBottomInternal()
})

watch(
  () => settingsStore.settings.backgroundImageDataUrl,
  (dataUrl) => {
    backgroundUrl.value = dataUrl || null
  },
  { immediate: true }
)

defineExpose({
  clearChat,
  scrollToBottom: scrollToBottomInternal,
})
</script>

<style scoped>
.message-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
