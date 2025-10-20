/**
 * チャット状態管理ストア
 * 現在のチャットセッション、メッセージ、入力状態を管理（非永続化）
 */

import { defineStore } from 'pinia'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useChatQuery, useDatabase } from '~/composables/useDatabase'
import { summarizeChatHistory } from '~/lib/summary'
import type { ApiError, AssistantMessage, AttachedFile, ChatInputState, ChatSession, Message, MessageDisplayState, StreamingState, UserMessage } from '~/types/chat'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { logger } from '~/lib/logger'
import { useSettingsStore } from './settings'
import { useNotificationSound } from '~/composables/useNotificationSound'

export const useChatStore = defineStore('chat', () => {
  const database = useDatabase()
  const settingsStore = useSettingsStore()
  const { playReplySound } = useNotificationSound()

  let autoSaveTimer: NodeJS.Timeout | null = null
  const isSaving = ref(false)
  const lastSaveTime = ref<number>(0)

  const currentSession = ref<ChatSession | null>(null)
  const isLoadingSession = ref(false)
  const isLoadingMessages = ref(false)

  const inputText = ref('')
  const attachedFiles = ref<AttachedFile[]>([])
  const isSending = ref(false)
  const isInputFocused = ref(false)

  const visibleMessages = ref<Message[]>([])
  const streamingMessage = ref<Partial<AssistantMessage> | null>(null)
  const streamingState = ref<StreamingState>('idle')
  const currentError = ref<ApiError | null>(null)

  const isEditingSystemPrompt = ref(false)
  const systemPromptBackup = ref('')

  // リトライ確認ダイアログ用の状態
  const showRetryDialog = ref(false)
  const retryTargetMessageId = ref<string | null>(null)
  const retryTargetMessage = ref<Message | null>(null)
  const retryResendMessage = ref<UserMessage | null>(null)
  const retryMessageCount = ref(0)

  const hasActiveSession = computed(() => currentSession.value !== null)
  const sessionId = computed(() => currentSession.value?.id || null)
  const sessionTitle = computed(() => currentSession.value?.title || '新規チャット')
  const systemPrompt = computed(() => currentSession.value?.systemPrompt || '')
  const messageCount = computed(() => currentSession.value?.messages.length || 0)

  const inputState = computed<ChatInputState>(() => ({
    text: inputText.value,
    attachments: attachedFiles.value,
    isSending: isSending.value,
    isFocused: isInputFocused.value,
  }))

  const hasAttachments = computed(() => attachedFiles.value.length > 0)
  const canSend = computed(() => {
    return (inputText.value.trim().length > 0 || hasAttachments.value) && !isSending.value && settingsStore.isValidConfiguration
  })

  const displayState = computed<MessageDisplayState>(() => ({
    visibleMessages: visibleMessages.value,
    streamingMessage: streamingMessage.value || undefined,
    streamingState: streamingState.value,
    error: currentError.value || undefined,
  }))

  const isStreaming = computed(() => streamingState.value === 'streaming')
  const hasError = computed(() => currentError.value !== null)
  const isIdle = computed(() => streamingState.value === 'idle' && !isSending.value)

  const userMessageCount = computed(() => {
    return visibleMessages.value.filter((m: Message) => m.role === 'user').length
  })

  const assistantMessageCount = computed(() => {
    return visibleMessages.value.filter((m: Message) => m.role === 'assistant').length
  })

  /** チャットセッションを保存する内部関数 */
  const performSave = async (reason: 'auto' | 'send' | 'response'): Promise<void> => {
    if (!currentSession.value || isSaving.value) {
      return
    }

    // メッセージがない場合は保存をスキップ
    if (visibleMessages.value.length === 0) {
      return
    }

    try {
      isSaving.value = true

      // セッションを更新
      currentSession.value.messages = [...visibleMessages.value]
      currentSession.value.updatedAt = Date.now()

      // タイトルが「新規チャット」の場合、最初のメッセージから生成
      if (currentSession.value.title === '新規チャット' && visibleMessages.value.length > 0) {
        const firstUserMessage = visibleMessages.value.find((m: Message) => m.role === 'user')
        if (firstUserMessage) {
          currentSession.value.title = generateTitleFromMessage(firstUserMessage.content)
        }
      }

      const success = await database.saveChat(currentSession.value)
      if (success) {
        lastSaveTime.value = Date.now()
        logger.info(`チャットを保存しました（${reason}）:`, { component: 'useChatStore' }, currentSession.value.id)
      } else {
        logger.error(`チャットの保存に失敗（${reason}）`, { component: 'useChatStore' })
      }
    } catch (error) {
      logger.error(`チャット保存エラー（${reason}）:`, { component: 'useChatStore' }, error)
    } finally {
      isSaving.value = false
    }
  }

  const startAutoSave = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
    }

    autoSaveTimer = setInterval(
      () => {
        performSave('auto')
      },
      5 * 60 * 1000
    ) // 5分間隔で自動保存
  }

  const stopAutoSave = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  const saveOnSend = async (): Promise<void> => {
    await performSave('send')
  }

  const saveOnResponse = async (): Promise<void> => {
    await performSave('response')
  }

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: database.generateChatId(),
      title: '新規チャット',
      systemPrompt: settingsStore.settings.systemPrompt,
      messages: [],
      persistentMemory: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    currentSession.value = newSession
    visibleMessages.value = []
    clearInput()
    clearStreamingState()
    clearError()

    // 自動保存を開始
    startAutoSave()

    logger.info('新しいチャットセッションを作成:', { component: 'useChatStore' }, newSession.id)
  }

  const loadSession = async (sessionId: string): Promise<boolean> => {
    try {
      isLoadingSession.value = true
      isLoadingMessages.value = true

      const session = await database.loadChat(sessionId)
      if (!session) {
        logger.error('チャットが見つかりませんでした', { component: 'useChatStore' })
        return false
      }

      currentSession.value = session
      visibleMessages.value = [...session.messages]
      clearInput()
      clearStreamingState()
      clearError()

      // 自動保存を開始
      startAutoSave()

      logger.info(`チャットセッションを読み込み: ${sessionId}`, { component: 'useChatStore' })
      return true
    } catch (error) {
      logger.error('チャットセッションの読み込みに失敗しました:', { component: 'useChatStore' }, error)
      return false
    } finally {
      isLoadingSession.value = false
      isLoadingMessages.value = false
    }
  }

  const saveSession = async (): Promise<boolean> => {
    if (!currentSession.value) return false

    try {
      // セッションを更新
      currentSession.value.messages = [...visibleMessages.value]
      currentSession.value.updatedAt = Date.now()

      // タイトルが「新規チャット」の場合、最初のメッセージから生成
      if (currentSession.value.title === '新規チャット' && visibleMessages.value.length > 0) {
        const firstUserMessage = visibleMessages.value.find((m: Message) => m.role === 'user')
        if (firstUserMessage) {
          currentSession.value.title = generateTitleFromMessage(firstUserMessage.content)
        }
      }

      const success = await database.saveChat(currentSession.value)
      if (success) {
        logger.info(`チャットセッションを保存: ${currentSession.value.id}`, { component: 'useChatStore' })
      }
      return success
    } catch (error) {
      logger.error('チャットセッションの保存に失敗しました:', { component: 'useChatStore' }, error)
      return false
    }
  }

  const updateTitle = async (newTitle: string): Promise<boolean> => {
    if (!currentSession.value) return false

    currentSession.value.title = newTitle
    return await saveSession()
  }

  const addUserMessage = (content: string, attachments?: AttachedFile[]): UserMessage => {
    // 開発用に詳細なデバッグログを出力
    if (process.env.NODE_ENV === 'development') {
      logger.info('[ChatStore] ユーザーメッセージ追加前', { component: 'useChatStore' }, { count: visibleMessages.value.length, content: content })
    }
    const message: UserMessage = {
      id: database.generateMessageId(),
      role: 'user',
      content,
      attachments,
      createdAt: Date.now(),
    }

    visibleMessages.value.push(message)
    // 開発用に詳細なデバッグログを出力
    if (process.env.NODE_ENV === 'development') {
      logger.info('[ChatStore] ユーザーメッセージ追加後', { component: 'useChatStore' }, { count: visibleMessages.value.length, content: content })
    }

    // セッションが存在しない場合は新規作成
    if (!currentSession.value) {
      createNewSession()
    }

    return message
  }

  const addAssistantMessage = (content: string, additionalData?: Partial<AssistantMessage>): AssistantMessage => {
    const message: AssistantMessage = {
      id: database.generateMessageId(),
      role: 'assistant',
      content,
      createdAt: Date.now(),
      ...additionalData,
    }

    visibleMessages.value.push(message)
    return message
  }

  const deleteMessage = async (messageId: string) => {
    const index = visibleMessages.value.findIndex((m: Message) => m.id === messageId)
    if (index > -1) {
      visibleMessages.value.splice(index, 1)
      // メッセージ削除後に自動的にセッションを保存
      await saveSession()
    }
  }

  const editMessage = async (messageId: string, newContent: string) => {
    const message = visibleMessages.value.find((m: Message) => m.id === messageId)
    if (message) {
      message.content = newContent
      message.updatedAt = Date.now()
      // メッセージ編集後に自動的にセッションを保存
      await saveSession()
    }
  }

  const setInputText = (text: string) => {
    inputText.value = text
  }

  const attachFile = (file: AttachedFile) => {
    if (attachedFiles.value.find((f: AttachedFile) => f.id === file.id)) {
      return // 既に添付済み
    }
    attachedFiles.value.push(file)
  }

  const removeAttachment = (fileId: string) => {
    const index = attachedFiles.value.findIndex((f: AttachedFile) => f.id === fileId)
    if (index > -1) {
      attachedFiles.value.splice(index, 1)
    }
  }

  const clearInput = () => {
    inputText.value = ''
    attachedFiles.value = []
  }

  const setInputFocus = (focused: boolean) => {
    isInputFocused.value = focused
  }

  const sendMessage = async (options?: { skipAddingUserMessage?: boolean }): Promise<boolean> => {
    if (!canSend.value) return false

    const contentToSend = inputText.value
    const attachmentsToSend = [...attachedFiles.value]

    try {
      isSending.value = true
      logger.info('[ChatStore] sendMessage() 開始', { component: 'useChatStore' }, { input: contentToSend })

      if (!options?.skipAddingUserMessage) {
        addUserMessage(contentToSend, attachmentsToSend)
      }
      clearInput()

      streamingState.value = 'connecting'

      // 送信時の即座保存
      await saveOnSend()
      if (process.env.NODE_ENV === 'development') {
        logger.info('[ChatStore] 送信時に保存済み', { count: visibleMessages.value.length })
      }

      return true
    } catch (error) {
      logger.error('メッセージ送信に失敗:', { component: 'useChatStore' }, error)
      setError({
        code: 'SEND_ERROR',
        message: 'メッセージの送信に失敗しました',
        retirable: true,
      })
      return false
    } finally {
      isSending.value = false
    }
  }

  const stopSending = () => {
    if (streamingState.value === 'streaming') {
      streamingState.value = 'idle'
      streamingMessage.value = null
    }
    isSending.value = false
  }

  const startStreaming = () => {
    streamingState.value = 'streaming'
    streamingMessage.value = {
      id: database.generateMessageId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    }
    clearError()
  }

  const appendStreamingText = (text: string) => {
    if (streamingMessage.value) {
      streamingMessage.value.content = (streamingMessage.value.content || '') + text
    }
  }

  const completeStreaming = async (finalData?: Partial<AssistantMessage>) => {
    if (finalData) {
      const lastAssistantReverseIndex = [...visibleMessages.value].reverse().findIndex((msg) => msg.role === 'assistant')
      if (lastAssistantReverseIndex !== -1) {
        const targetIndex = visibleMessages.value.length - 1 - lastAssistantReverseIndex
        const currentMessage = visibleMessages.value[targetIndex] as AssistantMessage
        const nextMessage: AssistantMessage = { ...currentMessage }

        let didMutate = false

        if (finalData.content !== undefined) {
          nextMessage.content = finalData.content
          didMutate = true
        }
        if (finalData.error !== undefined) {
          nextMessage.error = finalData.error
          didMutate = true
        }
        if (finalData.thoughts !== undefined) {
          nextMessage.thoughts = finalData.thoughts
          didMutate = true
        }
        if (finalData.translatedThoughts !== undefined) {
          nextMessage.translatedThoughts = finalData.translatedThoughts
          didMutate = true
        }
        if (finalData.functionCalls !== undefined) {
          nextMessage.functionCalls = finalData.functionCalls
          didMutate = true
        }
        if (finalData.functionResults !== undefined) {
          nextMessage.functionResults = finalData.functionResults
          didMutate = true
        }
        if (finalData.citations !== undefined) {
          nextMessage.citations = finalData.citations
          didMutate = true
        }
        if (finalData.originalContent !== undefined) {
          nextMessage.originalContent = finalData.originalContent
          didMutate = true
        }
        if (finalData.isProofread !== undefined) {
          nextMessage.isProofread = finalData.isProofread
          didMutate = true
        }

        if (didMutate) {
          nextMessage.updatedAt = Date.now()
        }

        visibleMessages.value[targetIndex] = nextMessage
      }
    }

    streamingState.value = 'completed'
    streamingMessage.value = null

    // 完了時の即座保存
    await saveOnResponse()
  }

  const clearStreamingState = () => {
    streamingState.value = 'idle'
    streamingMessage.value = null
  }

  const startEditingSystemPrompt = () => {
    if (!currentSession.value) return

    systemPromptBackup.value = currentSession.value.systemPrompt
    isEditingSystemPrompt.value = true
  }

  const cancelEditingSystemPrompt = () => {
    if (!currentSession.value) return

    currentSession.value.systemPrompt = systemPromptBackup.value
    isEditingSystemPrompt.value = false
    systemPromptBackup.value = ''
  }

  const saveSystemPrompt = async (newPrompt: string): Promise<boolean> => {
    if (!currentSession.value) return false

    currentSession.value.systemPrompt = newPrompt
    isEditingSystemPrompt.value = false
    systemPromptBackup.value = ''

    return await saveSession()
  }

  const setError = (error: ApiError) => {
    currentError.value = error
    streamingState.value = 'error'
  }

  const clearError = () => {
    currentError.value = null
    if (streamingState.value === 'error') {
      streamingState.value = 'idle'
    }
  }

  const retryFromError = (): UserMessage | null => {
    if (!currentError.value?.retirable) return null

    clearError()
    // 最後のユーザーメッセージを再送信準備
    const lastUserMessage = [...visibleMessages.value].reverse().find((m: Message) => m.role === 'user')
    if (lastUserMessage) {
      inputText.value = lastUserMessage.content
      if ((lastUserMessage as UserMessage).attachments) {
        attachedFiles.value = [...(lastUserMessage as UserMessage).attachments!]
      }
      return lastUserMessage as UserMessage
    }

    return null
  }

  /**
   * 選択したメッセージ以降（そのメッセージ含む）をすべて削除
   * ユーザーメッセージでもアシスタントメッセージでも同様に動作
   */
  const deleteMessagesAfter = async (messageId: string): Promise<boolean> => {
    const messageIndex = visibleMessages.value.findIndex((m: Message) => m.id === messageId)
    if (messageIndex === -1) {
      logger.error('メッセージが見つかりません:', { component: 'useChatStore' }, messageId)
      return false
    }

    try {
      const beforeLength = visibleMessages.value.length
      // 選択したメッセージ以降（そのメッセージ含む）を削除
      visibleMessages.value = visibleMessages.value.slice(0, messageIndex)

      // セッションに反映して保存
      await saveSession()

      logger.info(`${beforeLength - messageIndex} 件のメッセージを削除しました`, { component: 'useChatStore' })
      return true
    } catch (error) {
      logger.error('メッセージの削除に失敗しました:', { component: 'useChatStore' }, error)
      return false
    }
  }

  /** 指定したメッセージからリトライ（確認なし） */
  const retryFromMessage = async (messageId: string): Promise<UserMessage | null> => {
    if (isSending.value) {
      logger.warn('リトライ中にはリトライできません', { component: 'useChatStore' })
      return null
    }

    try {
      const targetMessage = visibleMessages.value.find((m: Message) => m.id === messageId)
      if (!targetMessage) {
        logger.error('対象のメッセージが見つかりません:', { component: 'useChatStore' }, messageId)
        return null
      }

      if (targetMessage.role !== 'user') {
        logger.error('リトライ対象はユーザーメッセージでなければなりません', { component: 'useChatStore' })
        return null
      }

      const messageToResend = targetMessage as UserMessage

      // 指定メッセージ以降を削除
      const deleteSuccess = await deleteMessagesAfter(messageId)
      if (!deleteSuccess) {
        return null
      }

      // メッセージ再送信の準備
      setInputText(messageToResend.content)
      attachedFiles.value = messageToResend.attachments ? [...messageToResend.attachments] : []

      clearError()

      logger.info('リトライの準備ができました:', { component: 'useChatStore' }, messageId)
      return messageToResend
    } catch (error) {
      logger.error('メッセージからリトライに失敗しました:', { component: 'useChatStore' }, error)
      setError({
        code: 'RETRY_ERROR',
        message: 'リトライに失敗しました',
        retirable: true,
      })
      return null
    }
  }

  /** 確認ダイアログ付きリトライ */
  const retryWithConfirmation = async (messageId: string): Promise<boolean> => {
    if (isSending.value) {
      logger.warn('リトライ中にはリトライできません', { component: 'useChatStore' })
      return false
    }

    const targetMessage = visibleMessages.value.find((m: Message) => m.id === messageId)
    if (!targetMessage) {
      logger.error('対象のメッセージが見つかりません:', { component: 'useChatStore' }, messageId)
      return false
    }

    if (targetMessage.role !== 'user') {
      logger.error('リトライ対象はユーザーメッセージでなければなりません', { component: 'useChatStore' })
      return false
    }

    const messageToResend = targetMessage as UserMessage

    // 削除されるメッセージ数を計算
    const messageIndex = visibleMessages.value.findIndex((m: Message) => m.id === messageId)
    const messagesToDelete = visibleMessages.value.length - messageIndex

    // ダイアログの状態を設定
    retryTargetMessageId.value = messageId
    retryTargetMessage.value = targetMessage
    retryResendMessage.value = messageToResend
    retryMessageCount.value = messagesToDelete
    showRetryDialog.value = true

    return true
  }

  /** リトライダイアログの確認処理 */
  const confirmRetry = async (): Promise<UserMessage | null> => {
    const messageId = retryTargetMessageId.value
    if (!messageId) return null

    showRetryDialog.value = false
    const message = await retryFromMessage(messageId)

    // 状態をクリア
    retryTargetMessageId.value = null
    retryTargetMessage.value = null
    retryResendMessage.value = null
    retryMessageCount.value = 0

    return message
  }

  /** リトライダイアログのキャンセル処理 */
  const cancelRetry = () => {
    showRetryDialog.value = false
    retryTargetMessageId.value = null
    retryTargetMessage.value = null
    retryResendMessage.value = null
    retryMessageCount.value = 0
  }

  /** リトライダイアログの表示状態を設定 */
  const setShowRetryDialog = (show: boolean) => {
    showRetryDialog.value = show
  }

  const generateTitleFromMessage = (content: string): string => {
    // 最初の50文字を使用してタイトルを生成
    const title = content.trim().substring(0, 50)
    return title.length < content.trim().length ? title + '...' : title
  }

  const clearChat = () => {
    visibleMessages.value = []
    clearInput()
    clearStreamingState()
    clearError()

    if (currentSession.value) {
      currentSession.value.messages = []
      currentSession.value.updatedAt = Date.now()
    }
  }

  const duplicateSession = (): ChatSession | null => {
    if (!currentSession.value) return null

    const duplicated: ChatSession = {
      ...currentSession.value,
      id: database.generateChatId(),
      title: `${currentSession.value.title} (コピー)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    return duplicated
  }

  const initialize = async () => {
    // 既にセッションが存在する場合は初期化しない
    if (currentSession.value) {
      logger.info('Chatストアにすでにセッションが存在します, 初期化をスキップします', { component: 'useChatStore' })
      return
    }

    try {
      // 最新のチャットを取得を試行
      const { getRecentChats } = useChatQuery()
      const recentChats = await getRecentChats(1)

      if (recentChats.length > 0) {
        // 最新のチャットが存在する場合はそれを読み込み
        const latestChat = recentChats[0]
        if (latestChat) {
          const success = await loadSession(latestChat.id)

          if (success) {
            logger.info('Chatストアが最新のチャットを読み込みました:', { component: 'useChatStore' }, latestChat.id)
            return
          } else {
            logger.warn('最新のチャットの読み込みに失敗しました, 新規チャットを作成します', { component: 'useChatStore' })
          }
        }
      }

      // 最新のチャットが存在しないか読み込みに失敗した場合は新規チャットを作成
      createNewSession()
      logger.info('Chatストアが新規チャットを作成しました', { component: 'useChatStore' })
    } catch (error) {
      logger.error('Chatストアの初期化中にエラーが発生しました:', { component: 'useChatStore' }, error)
      // エラーが発生した場合も新規チャットを作成
      createNewSession()
      logger.info('Chatストアが新規チャットを作成しました (フォールバック)', { component: 'useChatStore' })
    }
  }

  const reset = () => {
    stopAutoSave()

    currentSession.value = null
    isLoadingSession.value = false
    visibleMessages.value = []
    clearInput()
    clearStreamingState()
    clearError()
    isEditingSystemPrompt.value = false
    systemPromptBackup.value = ''
    isSaving.value = false
    lastSaveTime.value = 0
  }

  // 設定変更時にシステムプロンプトを同期
  watch(
    () => settingsStore.settings.systemPrompt,
    (newPrompt) => {
      if (currentSession.value && !isEditingSystemPrompt.value) {
        currentSession.value.systemPrompt = newPrompt
      }
    }
  )

  // アシスタントメッセージ追加時に通知音を再生
  let isInitialLoad = true

  // セッションが切り替わった時に初回ロードフラグをリセット
  watch(
    () => sessionId.value,
    () => {
      isInitialLoad = true
    }
  )

  watch(
    () => assistantMessageCount.value,
    (newCount, oldCount) => {
      // 初回ロード時（チャット読み込み直後）は再生しない
      if (isInitialLoad) {
        isInitialLoad = false
        return
      }

      // メッセージが増えた場合のみ通知音を再生
      if (newCount > oldCount) {
        playReplySound()
      }
    }
  )

  onUnmounted(() => {
    stopAutoSave()
  })

  /** 現在のメッセージリストを取得（要約フラグを考慮） */
  const currentMessages = computed(() => {
    // 要約機能が有効な場合は要約フラグがあるメッセージ以降の履歴のみを取得
    // 無効な場合は全てのメッセージを取得
    const messagesToSend = settingsStore.settings.enableSummary ? getMessagesAfterLastSummary() : visibleMessages.value

    return messagesToSend.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
      error: msg.role === 'assistant' && (msg as AssistantMessage).error,
      streaming: streamingMessage.value?.id === msg.id,
      thoughts: msg.role === 'assistant' ? (msg as AssistantMessage).thoughts : undefined,
      translatedThoughts: msg.role === 'assistant' ? (msg as AssistantMessage).translatedThoughts : undefined,
      functionCalls: msg.role === 'assistant' ? (msg as AssistantMessage).functionCalls : undefined,
      functionResults: msg.role === 'assistant' ? (msg as AssistantMessage).functionResults : undefined,
      attachments: msg.role === 'user' ? [...((msg as UserMessage).attachments ?? [])] : undefined,
    }))
  })

  const addMessage = (message: {
    role: string
    content: string
    timestamp: number
    error?: boolean
    thoughts?: string
    translatedThoughts?: string
    functionCalls?: FunctionCall[]
    functionResults?: FunctionCallResult[]
    attachments?: AttachedFile[]
  }) => {
    if (message.role === 'user') {
      addUserMessage(message.content, message.attachments)
    } else if (message.role === 'assistant') {
      addAssistantMessage(message.content, {
        error: message.error,
        thoughts: message.thoughts,
        translatedThoughts: message.translatedThoughts,
        functionCalls: message.functionCalls,
        functionResults: message.functionResults,
      })
    }
  }

  const updateMessage = (
    index: number,
    updates: { content?: string; error?: boolean; thoughts?: string; translatedThoughts?: string; functionCalls?: FunctionCall[]; functionResults?: FunctionCallResult[] }
  ) => {
    const message = visibleMessages.value[index]
    if (message) {
      if (updates.content !== undefined) {
        message.content = updates.content
        message.updatedAt = Date.now()
      }
      if (message.role === 'assistant') {
        const assistantMessage = message as AssistantMessage
        if (updates.error !== undefined) {
          assistantMessage.error = updates.error
        }
        if (updates.thoughts !== undefined) {
          assistantMessage.thoughts = updates.thoughts
        }
        if (updates.translatedThoughts !== undefined) {
          assistantMessage.translatedThoughts = updates.translatedThoughts
        }
        if (updates.functionCalls !== undefined) {
          assistantMessage.functionCalls = updates.functionCalls
        }
        if (updates.functionResults !== undefined) {
          assistantMessage.functionResults = updates.functionResults
        }
      }
    }
  }

  const setSending = (sending: boolean) => {
    isSending.value = sending
  }

  const resetCurrentChat = () => {
    clearChat()
  }

  /** 最後の要約メッセージ以降のメッセージを取得（要約メッセージも含む） */
  const getMessagesAfterLastSummary = (): Message[] => {
    const messages = visibleMessages.value

    // 最後の要約メッセージのインデックスを探す
    let lastSummaryIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message && message.role === 'assistant' && (message as AssistantMessage).isSummary) {
        lastSummaryIndex = i
        break
      }
    }

    // 要約メッセージ以降のメッセージを返す（要約メッセージも含む）
    return lastSummaryIndex >= 0 ? messages.slice(lastSummaryIndex) : messages
  }

  const summarizeMessages = async (messages: Message[]): Promise<boolean> => {
    if (!currentSession.value || !settingsStore.settings.enableSummary) {
      return false
    }

    try {
      logger.info('[ChatStore] 要約処理を開始', { messageCount: messages.length })

      // 要約対象のメッセージを準備
      const messagesToSummarize = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // 要約を実行
      const summaryContent = await summarizeChatHistory(messagesToSummarize, {
        apiKey: settingsStore.settings.apiKey,
        model: settingsStore.settings.summaryModelName,
        systemInstruction: settingsStore.settings.summarySystemInstruction,
      })

      if (!summaryContent) {
        logger.warn('[ChatStore] 要約結果が空です')
        return false
      }

      // 要約メッセージを作成
      const summaryMessage: AssistantMessage = {
        id: database.generateMessageId(),
        role: 'assistant',
        content: summaryContent,
        createdAt: Date.now(),
        isSummary: true,
      }

      // 要約メッセージを追加
      addAssistantMessage(summaryMessage.content, summaryMessage)

      // 要約対象のメッセージに要約フラグを設定
      for (const message of messages) {
        if (message.role === 'assistant') {
          ;(message as AssistantMessage).isSummary = true
        }
      }

      // セッションを保存
      await saveSession()

      logger.info('[ChatStore] 要約処理が完了しました')
      return true
    } catch (error) {
      logger.error('[ChatStore] 要約処理でエラーが発生しました:', { component: 'useChatStore' }, error)
      return false
    }
  }

  return {
    currentSession,
    isLoadingSession,
    isLoadingMessages,
    sessionId,
    sessionTitle,
    systemPrompt,
    messageCount,

    inputState,
    inputText,
    attachedFiles,
    hasAttachments,
    canSend,

    displayState,
    visibleMessages,
    streamingMessage,
    streamingState,
    currentError,
    isStreaming,
    hasError,
    isIdle,

    isEditingSystemPrompt,

    userMessageCount,
    assistantMessageCount,
    hasActiveSession,

    createNewSession,
    loadSession,
    saveSession,
    updateTitle,

    addUserMessage,
    addAssistantMessage,
    deleteMessage,
    editMessage,

    setInputText,
    attachFile,
    removeAttachment,
    clearInput,
    setInputFocus,

    sendMessage,
    stopSending,

    startStreaming,
    appendStreamingText,
    completeStreaming,
    clearStreamingState,

    startEditingSystemPrompt,
    cancelEditingSystemPrompt,
    saveSystemPrompt,

    setError,
    clearError,
    retryFromError,
    deleteMessagesAfter,
    retryFromMessage,
    retryWithConfirmation,
    confirmRetry,
    cancelRetry,
    setShowRetryDialog,

    // リトライダイアログ状態
    showRetryDialog: readonly(showRetryDialog),
    retryTargetMessage: readonly(retryTargetMessage),
    retryResendMessage: readonly(retryResendMessage),
    retryMessageCount: readonly(retryMessageCount),

    clearChat,
    duplicateSession,

    initialize,
    reset,

    currentMessages,
    addMessage,
    updateMessage,
    setSending,
    resetCurrentChat,
    summarizeMessages,

    isSaving: readonly(isSaving),
    lastSaveTime: readonly(lastSaveTime),
  }
})
