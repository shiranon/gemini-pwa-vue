<template>
  <div
    :class="bubbleClasses"
    :style="bubbleStyle"
  >
    <MarkdownRenderer
      v-if="!isEditing && enableMarkdown"
      class="text-foreground mb-2"
      :style="messageContentStyle"
      :content="message.content"
    />
    <div
      v-else-if="!isEditing"
      class="text-foreground mb-2 whitespace-pre-wrap"
      :style="messageContentStyle"
    >
      {{ message.content }}
    </div>

    <div
      v-else
      class="mb-2 space-y-2"
    >
      <Textarea
        ref="textareaRef"
        v-model="editContent"
        :style="messageContentStyle"
        class="min-h-[100px] resize-y"
        placeholder="メッセージを編集..."
        @keydown.ctrl.enter="handleSaveEdit"
        @keydown.esc="handleCancelEdit"
      />
      <div class="flex gap-2">
        <Button
          size="sm"
          @click="handleSaveEdit"
        >
          <Icon
            icon="material-symbols:check"
            class="mr-1 h-3 w-3"
          />
          保存
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="handleCancelEdit"
        >
          <Icon
            icon="material-symbols:close"
            class="mr-1 h-3 w-3"
          />
          キャンセル
        </Button>
      </div>
    </div>

    <FunctionCallDisplay
      v-if="shouldShowFunctionCalls"
      :function-calls="functionCallsToRender"
      :function-results="parsedFunctionResults"
      :open="false"
      :font-size="messageAppearanceSettings.functionCallFontSize"
    />

    <ThoughtProcessDisplay
      v-if="shouldShowThoughts && thoughtsToDisplay"
      :text="formattedThoughts"
      :font-size="messageAppearanceSettings.thoughtFontSize"
    />

    <div
      v-if="options.showTimestamp && message.timestamp"
      class="text-muted-foreground mt-2 text-sm"
    >
      {{ formattedTimestamp }}
    </div>

    <div
      v-if="showActions && !isEditing"
      :class="['border-border mt-3 flex gap-1 border-t pt-2', message.role === 'user' ? 'justify-end' : '']"
    >
      <Button
        v-if="options.allowEdit"
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        @click="handleEdit"
      >
        <Icon
          icon="material-symbols:edit-outline"
          class="h-4 w-4"
        />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        @click="handleCopy"
      >
        <Icon
          icon="material-symbols:content-copy-outline"
          class="h-4 w-4"
        />
      </Button>
      <Button
        v-if="options.allowRetry"
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        @click="handleRetry"
      >
        <Icon
          icon="material-symbols:refresh-rounded"
          class="h-4 w-4"
        />
      </Button>
      <Button
        v-if="options.allowDelete"
        variant="ghost"
        size="sm"
        class="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        @click="handleDelete"
      >
        <Icon
          icon="material-symbols:delete-outline"
          class="h-4 w-4"
        />
      </Button>
    </div>

    <ConfirmDialog
      v-model="showDeleteDialog"
      title="メッセージを削除"
      description="このメッセージを削除してもよろしいですか？この操作は取り消すことができません。"
      confirm-text="削除する"
      cancel-text="キャンセル"
      :is-dangerous="true"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { ChatMessage, MessageBubbleOptions } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { formatMessageTimestamp } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import MarkdownRenderer from '~/components/common/MarkdownRenderer.vue'
import ConfirmDialog from '~/components/molecules/dialogs/ConfirmDialog.vue'
import { useSettingsStore } from '~/stores/settings'
import { hexToRgba } from '~/utils/color'
import FunctionCallDisplay from '~/components/molecules/page-chat/FunctionCallDisplay.vue'
import ThoughtProcessDisplay from '~/components/molecules/page-chat/ThoughtProcessDisplay.vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'

interface Props {
  message: ChatMessage
  options?: Partial<MessageBubbleOptions>
  enableMarkdown?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({
    showTimestamp: true,
    allowEdit: false,
    allowDelete: false,
    allowRetry: false,
  }),
  enableMarkdown: true,
})

const settingsStore = useSettingsStore()
const { messageAppearanceSettings } = storeToRefs(settingsStore)

const isEditing = ref(false)
const editContent = ref('')
const textareaRef = ref<InstanceType<typeof Textarea>>()
const showDeleteDialog = ref(false)

const emit = defineEmits<{
  edit: [message: ChatMessage]
  delete: [message: ChatMessage]
  copy: [message: ChatMessage]
  retry: [message: ChatMessage]
}>()

const bubbleClasses = computed(() => {
  const baseClasses = ['message-bubble relative border shadow-sm transition-all duration-200']

  if (props.message.role === 'user') {
    baseClasses.push('ml-2')
  } else {
    baseClasses.push('mr-2')
  }

  if (props.message.error) {
    baseClasses.push('border-destructive/40 ring-1 ring-destructive/40')
  }

  return baseClasses
})

const bubbleStyle = computed(() => {
  const appearance = messageAppearanceSettings.value
  const baseColor = props.message.role === 'user' ? appearance.userBubbleColor : appearance.assistantBubbleColor
  return {
    fontFamily: appearance.fontFamily || 'var(--message-font-family)',
    backgroundColor: hexToRgba(baseColor, appearance.opacity),
    borderRadius: `${appearance.bubbleRadius}px`,
    padding: `${appearance.bubblePaddingY}px ${appearance.bubblePaddingX}px`,
    borderColor: hexToRgba(baseColor, props.message.role === 'user' ? 0.45 : 0.35),
    color: 'var(--foreground)',
  } as Record<string, string>
})

const messageContentStyle = computed(() => ({
  fontSize: `${messageAppearanceSettings.value.messageFontSize}px`,
  lineHeight: 1.6,
}))

const showActions = computed(() => {
  return props.options.allowEdit || props.options.allowDelete || props.options.allowRetry
})

const formattedTimestamp = computed(() => {
  return formatMessageTimestamp(props.message.timestamp)
})

const shouldShowThoughts = computed(() => {
  return settingsStore.settings.includeThoughts && props.message.role === 'assistant'
})

const thoughtsToDisplay = computed(() => {
  const { thoughts, translatedThoughts } = props.message

  // 翻訳が有効で翻訳版がある場合は翻訳版を、そうでなければオリジナルを表示
  if (settingsStore.settings.enableThoughtTranslation && translatedThoughts) {
    return translatedThoughts
  }
  return thoughts
})

const formattedThoughts = computed(() => {
  // 思考プロセスは常にプレーンテキストとして表示（Markdown処理なし）
  return thoughtsToDisplay.value || ''
})

const parsedFunctionCalls = computed<FunctionCall[] | null>(() => {
  const message = props.message as ChatMessage & { functionCalls?: unknown }
  if (message.role !== 'assistant' || !message.functionCalls) {
    return null
  }
  try {
    const value = typeof message.functionCalls === 'string' ? JSON.parse(message.functionCalls) : message.functionCalls
    return Array.isArray(value) ? (value as FunctionCall[]) : null
  } catch {
    return null
  }
})

const parsedFunctionResults = computed<FunctionCallResult[] | undefined>(() => {
  const message = props.message as ChatMessage & { functionResults?: unknown }
  if (message.role !== 'assistant' || !message.functionResults) {
    return undefined
  }
  try {
    const value = typeof message.functionResults === 'string' ? JSON.parse(message.functionResults) : message.functionResults
    return Array.isArray(value) ? (value as FunctionCallResult[]) : undefined
  } catch {
    return undefined
  }
})

const functionCallsToRender = computed(() => parsedFunctionCalls.value ?? [])

const shouldShowFunctionCalls = computed(() => functionCallsToRender.value.length > 0)

const handleEdit = async () => {
  isEditing.value = true
  editContent.value = props.message.content

  await nextTick()
  if (textareaRef.value?.$el) {
    textareaRef.value.$el.focus()
  }
}

const handleSaveEdit = () => {
  if (editContent.value.trim() !== props.message.content) {
    emit('edit', { ...props.message, content: editContent.value.trim() })
  }
  handleCancelEdit()
}

const handleCancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

const handleDelete = () => {
  showDeleteDialog.value = true
}

const handleDeleteConfirm = () => {
  emit('delete', props.message)
  showDeleteDialog.value = false
}

const handleDeleteCancel = () => {
  showDeleteDialog.value = false
}

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    emit('copy', props.message)
  } catch (error) {
    console.error('Failed to copy message content:', error)
  }
}

const handleRetry = () => {
  emit('retry', props.message)
}
</script>

<style scoped>
.message-bubble {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  transform: translateZ(0);
}

.message-bubble code {
  background-color: color-mix(in srgb, var(--foreground) 12%, var(--background));
  color: var(--foreground);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.875em;
}

.message-bubble pre {
  background-color: color-mix(in srgb, var(--foreground) 8%, var(--background));
  border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--border));
  color: var(--foreground);
}

.message-bubble strong {
  font-weight: 600;
}

.message-bubble em {
  font-style: italic;
}
</style>
