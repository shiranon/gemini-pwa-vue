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
      class="z-10 flex-1 space-y-6 overflow-y-auto px-4 pb-6"
    >
      <SystemPromptEditor />
      <template
        v-for="(message, index) in messages"
        :key="`${message.timestamp}-${index}`"
      >
        <MessageWithAvatar
          v-if="settingsStore.settings.avatarEnabled"
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
        <MessageBubble
          v-else
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
      </template>
    </div>

    <div
      v-if="attachedFiles.length > 0"
      class="bg-muted/60 border-border rounded-lg border border-dashed p-3"
    >
      <div class="flex flex-col gap-3">
        <div
          v-for="file in attachedFiles"
          :key="file.id"
          class="bg-background/80 flex items-center justify-between gap-3 rounded-md px-3 py-2"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <!-- 画像の場合はプレビュー、それ以外はアイコン -->
            <img
              v-if="isImageFile(file.type) && file.previewUrl"
              :src="file.previewUrl"
              :alt="file.name"
              class="h-auto w-20 flex-shrink-0 rounded object-cover"
            />
            <Icon
              v-else
              :icon="getAttachmentIcon(file.type)"
              class="text-muted-foreground h-4 w-4 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ file.name }}</p>
              <p class="text-muted-foreground text-xs">{{ formatFileSize(file.size) }}</p>

              <!-- テキストファイルプレビュー -->
              <div
                v-if="isTextFile(file.type) && file.data"
                class="mt-2"
              >
                <div class="bg-muted/30 max-h-24 overflow-y-auto rounded border p-2 text-xs">
                  <pre class="whitespace-pre-wrap">{{ getTextPreview(file.data) }}</pre>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="removeAttachment(file.id)"
          >
            <Icon
              icon="mdi:close"
              class="h-4 w-4"
            />
          </Button>
        </div>
      </div>
    </div>
    <div class="border-border bg-background/90 sticky bottom-0 z-20 border-t p-2 shadow-lg backdrop-blur">
      <div class="flex gap-2">
        <div class="flex flex-col gap-1">
          <QuickActionsModal
            :disabled="isSending"
            button-label="アクション"
            :can-summarize="canSummarize"
            :is-summarizing="isSummarizing"
            @summarize="summarizeChat"
          />
          <ProfileSelect
            :profiles="profiles"
            :selected-profile-id="selectedProfileId"
            mode="avatar-only"
            @update:selected-profile-id="handleProfileChange"
          />
        </div>
        <div class="flex flex-1 flex-col gap-2">
          <textarea
            id="chat-input"
            v-model="inputText"
            :disabled="isSending"
            placeholder="メッセージを入力..."
            class="border-input focus:border-primary focus:ring-primary min-h-[80px] flex-1 resize-none rounded-lg border p-4 text-lg focus:ring-2 focus:outline-none"
            @keydown="handleKeydown"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
          />
        </div>
        <div class="flex flex-col gap-2">
          <Button
            :disabled="isSending || (!inputText.trim() && !hasAttachments)"
            class="size-10 p-2 text-lg sm:size-11"
            @click="sendMessage"
          >
            <div v-if="isSending">
              <Icon
                icon="line-md:loading-alt-loop"
                width="24"
                height="24"
              />
            </div>
            <div v-else>送</div>
          </Button>
          <Button
            variant="outline"
            class="size-10 p-2 text-lg sm:size-11"
            :disabled="isSending"
            @click="openAttachmentDialog"
          >
            <Icon
              icon="material-symbols:attach-file"
              class="h-5 w-5"
            />
          </Button>
        </div>
      </div>
      <input
        ref="attachmentInputRef"
        class="hidden"
        type="file"
        :accept="attachmentAccept"
        multiple
        @change="handleAttachmentChange"
      />
    </div>
    <RetryConfirmDialog
      v-model="showRetryDialogLocal"
      :target-message="retryDialogTargetMessage"
      :message-count="chatStore.retryMessageCount"
      :resend-message="retryDialogResendMessage"
      @confirm="handleRetryConfirm"
      @cancel="handleRetryCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave } from 'vue-router'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import { useGeminiStore } from '~/stores/gemini'
import { useOpenAiStore } from '~/stores/openai'
import { useClaudeStore } from '~/stores/claude'
import { useOllamaStore } from '~/stores/ollama'
import { useSettings } from '~/composables/useSettings'
import { useTemporaryBackground } from '~/composables/useTemporaryBackground'
import { scrollToBottom } from '~/lib/scroll'
import MessageWithAvatar from '~/components/molecules/page-chat/MessageWithAvatar.vue'
import MessageBubble from '~/components/molecules/page-chat/MessageBubble.vue'
import SystemPromptEditor from '~/components/molecules/page-chat/SystemPromptEditor.vue'
import RetryConfirmDialog from '~/components/molecules/dialogs/RetryConfirmDialog.vue'
import QuickActionsModal from '~/components/molecules/page-chat/QuickActionsModal.vue'
import ProfileSelect from '~/components/molecules/page-setting/ProfileSelect.vue'
import { Button } from '~/components/ui/button'
import { Icon } from '@iconify/vue'
import { hexToRgba } from '~/lib/color'
import { extractBackgroundSelectionFromMessage, getBackgroundImageDataUrl, getLatestAssistantMessage } from '~/lib/backgroundManager'
import { backgroundDirectiveExtractor } from '~/lib/backgroundDirectiveExtractor'
import type { ApiError, ChatMessage, AttachedFile, Message, AssistantMessage } from '~/types/chat'
import { toast } from 'vue-sonner'
import { logger } from '~/lib/logger'
import { formatFileSize } from '~/lib/format'
import { convertFileToAttachedFile } from '~/lib/file'
import { ATTACHMENT_LIMITS } from '~/constants/constants'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const profilesStore = useSettingsProfilesStore()
const geminiStore = useGeminiStore()
const openaiStore = useOpenAiStore()
const claudeStore = useClaudeStore()
const ollamaStore = useOllamaStore()
const { attachedFiles } = storeToRefs(chatStore)

// 現在のプロバイダーに応じて適切なストアを取得
const currentApiStore = computed(() => {
  const apiProvider = profilesStore.activeProfile?.settings.apiProvider || 'gemini'
  if (apiProvider === 'openai') return openaiStore
  if (apiProvider === 'claude') return claudeStore
  if (apiProvider === 'ollama') return ollamaStore
  return geminiStore
})

// 設定同期用のメソッドを取得（ダイアログ関数は使用しないので空のスタブを渡す）
const { syncLocalSettings } = useSettings({
  showAlert: () => {},
  showConfirm: () => Promise.resolve(true),
})

// ページを離れる時に一時的な設定をクリア
onBeforeRouteLeave(() => {
  profilesStore.clearTemporarySettings()
})

const inputText = ref('')
const messageContainer = ref<HTMLElement>()
const backgroundUrl = ref<string | null>(null)
const isProfileLoading = ref(false)
const attachmentInputRef = ref<HTMLInputElement | null>(null)
// IME入力中のEnter送信を防ぐ（日本語入力など）
const isComposing = ref(false)

// 一時的な背景画像管理
const { currentBackgroundUrl, setTemporaryBackground } = useTemporaryBackground()

// 背景ディレクティブ抽出用のcomposable
const { extractDirectiveFromContent } = backgroundDirectiveExtractor({
  maxDepth: 10,
  enableCaching: true,
})

// プロファイル関連の変数
const profiles = computed(() => profilesStore.sortedProfiles)
const selectedProfileId = computed(() => profilesStore.activeProfileId)
// selectedProfile は ProfileAvatarButton 内で使用されるため、ここでは不要
// 一時的な背景画像が設定されている場合はそれを優先、そうでなければ通常の背景画像を使用
const backgroundStyle = computed(() => {
  const url = currentBackgroundUrl.value || backgroundUrl.value
  if (!url) return {}
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  } as Record<string, string>
})

const overlayColorStyle = computed(() => {
  const hex = settingsStore.settings.overlayColor || '#000000'
  return hexToRgba(hex, settingsStore.settings.overlayOpacity)
})

const messages = computed(() =>
  chatStore.visibleMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.createdAt,
    error: msg.role === 'assistant' && (msg as AssistantMessage).error,
    streaming: false,
    thoughts: msg.role === 'assistant' ? (msg as AssistantMessage).thoughts : undefined,
    translatedThoughts: msg.role === 'assistant' ? (msg as AssistantMessage).translatedThoughts : undefined,
    functionCalls: msg.role === 'assistant' ? (msg as AssistantMessage).functionCalls : undefined,
    functionResults: msg.role === 'assistant' ? (msg as AssistantMessage).functionResults : undefined,
    attachments: 'attachments' in msg ? msg.attachments : undefined,
    isStreamingComplete: true,
  }))
)
const retryDialogTargetMessage = computed(() => chatStore.retryTargetMessage as Message | null)
const retryDialogResendMessage = computed(() => chatStore.retryResendMessage as Message | null)
const isSending = computed(() => currentApiStore.value.isSending)
const hasAttachments = computed(() => attachedFiles.value.length > 0)
const attachmentAccept = ATTACHMENT_LIMITS.SUPPORTED_TYPES.join(',')

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'mdi:file-image-outline'
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml' || mimeType === 'text/xml') return 'mdi:file-document-outline'
  return 'mdi:file-outline'
}

const isImageFile = (mimeType: string) => {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)
}

const isTextFile = (mimeType: string) => {
  return ['text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml', 'text/xml', 'text/markdown'].includes(mimeType)
}

const getTextContent = (base64Data: string): string => {
  try {
    // Base64データをデコードしてテキストに変換（UTF-8対応）
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new TextDecoder('utf-8').decode(bytes)
  } catch (error) {
    console.warn('テキストのデコードに失敗しました:', error)
    return '[テキストの読み込みに失敗しました]'
  }
}

const getTextPreview = (base64Data: string): string => {
  const content = getTextContent(base64Data)
  return content.length > 30 ? content.substring(0, 30) + '...' : content
}

const openAttachmentDialog = () => {
  if (isSending.value) return
  attachmentInputRef.value?.click()
}

const handleAttachmentSelection = async (files: FileList | null) => {
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    try {
      const attachedFile = await convertFileToAttachedFile(file)
      chatStore.attachFile(attachedFile)
      // プレビューURLを管理対象に追加
      if (attachedFile.previewUrl) {
        previewUrls.value.add(attachedFile.previewUrl)
      }
    } catch (error) {
      logger.error('ファイル添付に失敗しました', { component: 'ChatInterface', fileName: file.name }, error)
      const errorMessage = error instanceof Error ? error.message : `"${file.name}" の読み込みに失敗しました`
      toast.error(errorMessage)
    }
  }
}

const handleAttachmentChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files

  if (files && files.length > 0) {
    try {
      await handleAttachmentSelection(files)
    } catch (error) {
      logger.error('ファイル添付処理でエラーが発生しました', { component: 'ChatInterface' }, error)
      toast.error('ファイルの処理中にエラーが発生しました')
    } finally {
      // 処理完了後にinputをクリア（同じファイルを再度選択可能にするため）
      if (target) target.value = ''
    }
  }
}

const removeAttachment = (fileId: string) => {
  // プレビューURLを解放
  const file = attachedFiles.value.find((f) => f.id === fileId)
  if (file?.previewUrl) {
    URL.revokeObjectURL(file.previewUrl)
    previewUrls.value.delete(file.previewUrl)
  }
  chatStore.removeAttachment(fileId)
}

// ローカルなダイアログ状態管理
const showRetryDialogLocal = ref(false)

// ChatStoreの状態と同期
watch(
  () => chatStore.showRetryDialog,
  (newValue) => {
    showRetryDialogLocal.value = newValue
  },
  { immediate: true }
)

watch(showRetryDialogLocal, (newValue) => {
  chatStore.setShowRetryDialog(newValue)
})
const ERROR_TOAST_ID = 'gemini-error'
const RETRY_TOAST_ID = 'gemini-auto-retry'

const dismissErrorToast = () => {
  toast.dismiss(ERROR_TOAST_ID)
}

const dismissRetryToast = () => {
  toast.dismiss(RETRY_TOAST_ID)
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
      descriptionParts.push(`自動リトライ予定: ${seconds}秒後 (${attempt}/${maxRetries})`)
    } else {
      descriptionParts.push(`自動リトライ予定: ${seconds}秒後`)
    }
  }

  toast.error(error.message, {
    id: ERROR_TOAST_ID,
    description: descriptionParts.join('\n') || undefined,
    action: error.retirable
      ? {
          label: 'リトライ',
          onClick: () => {
            void geminiStore.retryLastUserMessage({
              onError: handleGeminiError,
              onRetryScheduled: notifyRetryScheduled,
              onRetryStarted: notifyRetryStarted,
            })
          },
        }
      : undefined,
  })
}

const notifyRetryScheduled = ({ attempt, delayMs }: { attempt: number; delayMs: number }) => {
  const seconds = Math.ceil(delayMs / 1000)
  const maxRetries = settingsStore.retrySettings.maxRetries
  const suffix = maxRetries > 0 ? ` (${attempt}/${maxRetries})` : ''

  toast.info(`自動リトライを準備中${suffix}`, {
    id: RETRY_TOAST_ID,
    description: `${seconds}秒後にリトライします`,
  })
}

const notifyRetryStarted = ({ attempt }: { attempt: number }) => {
  const retryCount = Math.max(1, attempt - 1)
  const maxRetries = settingsStore.retrySettings.maxRetries
  const suffix = maxRetries > 0 ? ` (${retryCount}/${maxRetries})` : ''

  toast.loading(`自動リトライ${suffix}を実行中...`, {
    id: RETRY_TOAST_ID,
  })
}

const handleGeminiError = (error: ApiError | null) => {
  if (error) {
    showErrorToast(error)
    if (!error.retrying) {
      dismissRetryToast()
    }
  } else {
    dismissErrorToast()
    dismissRetryToast()
  }
}

const sendMessage = async (options?: { contentOverride?: string; skipAddingUserMessage?: boolean; attachmentsOverride?: AttachedFile[] }) => {
  // 二重送信防止の早期リターン
  if (isSending.value) return

  const rawContent = options?.contentOverride ?? inputText.value
  inputText.value = ''
  const content = rawContent.trim()
  const attachmentsToSend = options?.attachmentsOverride ?? attachedFiles.value.map((file) => ({ ...file }))
  const hasAttachmentsToSend = attachmentsToSend.length > 0

  if (!content && !hasAttachmentsToSend) return

  dismissRetryToast()

  try {
    const success = await currentApiStore.value.sendChatMessage({
      content: rawContent,
      attachments: attachmentsToSend,
      skipAddingUserMessage: options?.skipAddingUserMessage,
      onError: handleGeminiError,
      onRetryScheduled: notifyRetryScheduled,
      onRetryStarted: notifyRetryStarted,
    })

    return success
  } catch (error) {
    logger.error('Message sending error:', { component: 'ChatInterface' }, error)
    return false
  } finally {
    // 成功・失敗に関わらず、添付ファイルのプレビューURLを解放
    if (!options?.attachmentsOverride) {
      attachmentsToSend.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
          previewUrls.value.delete(file.previewUrl)
        }
      })
    }
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && settingsStore.settings.enterToSend && !isComposing.value) {
    e.preventDefault()
    sendMessage()
  }
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const clearChat = () => {
  chatStore.resetCurrentChat()
}

const isSummarizing = ref(false)

const canSummarize = computed(() => {
  const apiProvider = profilesStore.activeProfile?.settings.apiProvider || 'gemini'
  return apiProvider !== 'ollama' && settingsStore.settings.enableSummary && chatStore.visibleMessages.length > 0 && !isSummarizing.value
})

const summarizeChat = async () => {
  if (!canSummarize.value || isSummarizing.value) return // 二重実行防止

  try {
    isSummarizing.value = true

    // 型ガードを使用してパフォーマンスを最適化
    const isAssistantMessage = (msg: Message): msg is AssistantMessage => msg.role === 'assistant'

    // 要約対象のメッセージを取得（要約フラグがあるメッセージ以降）
    const messagesToSummarize = chatStore.visibleMessages.filter((msg) => !isAssistantMessage(msg) || !msg.isSummary)

    if (messagesToSummarize.length === 0) {
      toast.info('要約するメッセージがありません')
      return
    }

    // 要約処理を実行
    const summary = await chatStore.summarizeMessages(messagesToSummarize)

    if (summary) {
      toast.success('チャットを要約しました')
    } else {
      toast.error('要約に失敗しました')
    }
  } catch (error) {
    logger.error('要約処理でエラーが発生しました:', { component: 'ChatInterface' }, error)
    toast.error('要約処理でエラーが発生しました')
  } finally {
    isSummarizing.value = false
  }
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
  logger.info('handleMessageDelete', { component: 'ChatInterface' }, { originalMessageId: originalMessage?.id })
  if (originalMessage) {
    await chatStore.deleteMessage(originalMessage.id)
  }
}

const handleMessageCopy = (copiedMessage: ChatMessage) => {
  // コピー完了の通知（必要に応じてトーストなどを表示）
  logger.info('Message copied to clipboard:', { component: 'ChatInterface' }, { content: copiedMessage.content })
}

const handleMessageRetry = async (messageToRetry: ChatMessage) => {
  if (isSending.value) return

  // ChatStoreのvisibleMessagesからメッセージIDを検索してリトライ
  const originalMessage = chatStore.visibleMessages.find((m) => m.createdAt === messageToRetry.timestamp)
  if (originalMessage) {
    await chatStore.retryWithConfirmation(originalMessage.id)
  }
}

const handleRetryConfirm = async () => {
  try {
    const messageToResend = await chatStore.confirmRetry()
    if (messageToResend) {
      inputText.value = ''
      dismissRetryToast()
      await currentApiStore.value.sendChatMessage({
        content: messageToResend.content,
        attachments: messageToResend.attachments,
        onError: handleGeminiError,
        onRetryScheduled: notifyRetryScheduled,
        onRetryStarted: notifyRetryStarted,
      })
    }
  } catch (error) {
    logger.error('Retry confirmation error:', { component: 'ChatInterface' }, error)
    chatStore.cancelRetry()
    showRetryDialogLocal.value = false
  }
}

const handleRetryCancel = () => {
  chatStore.cancelRetry()
  showRetryDialogLocal.value = false
}

const scrollToBottomInternal = () => {
  if (messageContainer.value) {
    scrollToBottom(messageContainer.value)
  }
}

const handleProfileChange = async (profileId: string | null) => {
  if (!profileId) return

  try {
    // プロファイル切り替え中のローディング状態を設定
    isProfileLoading.value = true
    // プロファイルを切り替えて設定を適用
    profilesStore.applyProfileToSettings(profileId)
    await profilesStore.saveProfiles() // アクティブプロファイルを永続化

    // 状態更新完了を待ってからUIを更新
    await nextTick()
    syncLocalSettings()
    // プロファイル設定も自動的に読み込まれる（useProfileSettingsのwatchで）

    logger.info('プロファイルを切り替えて保存しました', { profileId })
    toast.success('プロファイルを切り替えました')
  } catch (error) {
    logger.error('プロファイル切り替え時の保存に失敗', { component: 'ChatInterface' }, error)
    toast.error('プロファイルの切り替えに失敗しました')
  } finally {
    isProfileLoading.value = false
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

// プレビューURLを管理（メモリリーク防止）
const previewUrls = ref<Set<string>>(new Set())

onMounted(() => {
  scrollToBottomInternal()
})

onUnmounted(() => {
  // プレビューURLをクリーンアップ
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  previewUrls.value.clear()
})

watch(
  () => settingsStore.settings.backgroundImageDataUrl,
  (dataUrl) => {
    backgroundUrl.value = dataUrl || null
  },
  { immediate: true }
)

// 最新のアシスタントメッセージを computed で取得
const latestAssistantMessage = computed(() => getLatestAssistantMessage(messages.value))

// タイムスタンプのみを監視
const latestAssistantMessageTimestamp = computed(() => latestAssistantMessage.value?.timestamp ?? null)

const lastProcessedTimestamp = ref<number | null>(null)
const isProcessingBackground = ref(false)

// Function Callingの結果とDirectiveを監視して一時的な背景画像を設定
watch(latestAssistantMessageTimestamp, async (timestamp) => {
  if (!timestamp || timestamp === lastProcessedTimestamp.value || isProcessingBackground.value) return

  const latestMessage = latestAssistantMessage.value
  if (!latestMessage) return

  // 処理開始時に即座にタイムスタンプを更新
  lastProcessedTimestamp.value = timestamp
  isProcessingBackground.value = true

  try {
    let categoryName: string | null = null
    let imageName: string | null = null
    let source = ''

    // 1. Function Calling結果をチェック（優先）
    const functionCallingResult = extractBackgroundSelectionFromMessage(latestMessage)
    if (functionCallingResult) {
      categoryName = functionCallingResult.categoryName
      imageName = functionCallingResult.imageName
      source = 'Function Calling'
    }

    // 2. Function Callingがない場合のみ、Directiveをチェック
    if (!categoryName && latestMessage.content) {
      const directive = extractDirectiveFromContent(latestMessage.content)
      if (directive) {
        categoryName = directive.categoryName
        imageName = directive.imageName
        source = 'Directive'
      }
    }

    // 3. 背景画像を取得して設定
    if (categoryName && imageName) {
      const dataUrl = await getBackgroundImageDataUrl(categoryName, imageName)
      if (dataUrl) {
        setTemporaryBackground(dataUrl)
        logger.info(`[ChatInterface] ${source}の結果で一時的な背景画像を設定しました`, {
          component: 'ChatInterface',
          source,
          categoryName,
          imageName,
        })
      } else {
        // エラーハンドリング：dataUrl が null の場合
        logger.warn('[ChatInterface] 背景画像の取得に失敗しました', {
          component: 'ChatInterface',
          categoryName,
          imageName,
        })
      }
    }
  } catch (error) {
    logger.error('[ChatInterface] 背景画像設定エラー', { component: 'ChatInterface' }, error)
  } finally {
    // 処理完了フラグをリセット
    isProcessingBackground.value = false
  }
})

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
