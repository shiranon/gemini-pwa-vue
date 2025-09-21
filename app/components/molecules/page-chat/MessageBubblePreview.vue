<template>
  <div class="max-w-full space-y-3 overflow-hidden">
    <div
      class="message-bubble border-border relative ml-2 max-w-full border shadow-sm transition-all duration-200 sm:ml-4 md:ml-8"
      :style="userBubbleStyle"
    >
      <div
        class="mb-2"
        :style="messageTextStyle"
      >
        こんにちは！これはメッセージ外観プレビューです。
        <br />
        <strong>太字</strong>や<em>斜体</em>、<code>コード</code>も表示されます。
      </div>
      <div class="text-muted-foreground mt-2 text-sm">
        {{ formatMessageTimestamp(Date.now()) }}
      </div>
    </div>

    <div
      class="message-bubble border-border relative mr-2 max-w-full border shadow-sm transition-all duration-200 sm:mr-4 md:mr-8"
      :style="assistantBubbleStyle"
    >
      <div
        class="mb-2"
        :style="messageTextStyle"
      >
        プレビューでフォントサイズや角丸、背景色などを確認できます。
        <br />
        Function Calling や思考プロセスもサンプル表示しています。
      </div>

      <div class="mt-3 space-y-2">
        <p class="text-muted-foreground text-sm">画像プレビュー</p>
        <img
          src="/placeholder.svg"
          alt="Sample preview"
          loading="lazy"
          decoding="async"
          :style="previewImageStyle"
        />
      </div>

      <div
        class="border-border bg-muted/70 mt-3 rounded-md border p-3 shadow-sm"
        :style="functionCallStyle"
      >
        <div class="text-primary flex items-center justify-between font-medium">
          <span>summarizeDocument</span>
          <span class="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs">42ms</span>
        </div>
        <pre
          class="border-primary/30 bg-primary/10 text-primary mt-2 overflow-x-auto rounded border p-2"
          :style="codeSampleStyle"
        >
{"url": "https://example.com"}</pre
        >
      </div>

      <div
        class="border-border bg-muted/70 mt-3 rounded-md border p-3"
        :style="thoughtStyle"
      >
        <div class="text-muted-foreground mb-1 flex items-center gap-2 font-medium">
          <Icon
            icon="material-symbols:psychology"
            class="text-primary h-4 w-4"
          />
          思考プロセス
        </div>
        <p class="text-muted-foreground whitespace-pre-wrap">ユーザーの質問意図を分析し、回答の構造を設計します。</p>
      </div>

      <div class="text-muted-foreground mt-2 text-sm">
        {{ formatMessageTimestamp(Date.now() - 60000) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { formatMessageTimestamp } from '~/lib/format'
import { hexToRgba } from '~/utils/color'

interface MessageBubblePreviewAppearance {
  fontFamily: string
  messageFontSize: number
  functionCallFontSize: number
  thoughtFontSize: number
  bubbleRadius: number
  bubblePaddingX: number
  bubblePaddingY: number
  imageWidthPercent: number | null
  imageJustify: 'start' | 'center' | 'end'
  userBubbleColor: string
  assistantBubbleColor: string
  opacity: number
}

const DEFAULT_APPEARANCE: MessageBubblePreviewAppearance = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  messageFontSize: 16,
  functionCallFontSize: 14,
  thoughtFontSize: 13,
  bubbleRadius: 16,
  bubblePaddingX: 20,
  bubblePaddingY: 16,
  imageWidthPercent: null,
  imageJustify: 'start',
  userBubbleColor: '#eff6ff',
  assistantBubbleColor: '#ffffff',
  opacity: 0.9,
}

const props = defineProps<{
  appearance?: MessageBubblePreviewAppearance
}>()

const normalizedAppearance = computed(() => ({
  ...DEFAULT_APPEARANCE,
  ...(props.appearance ?? {}),
}))

const bubbleBaseStyle = computed(() => ({
  fontFamily: normalizedAppearance.value.fontFamily || 'var(--message-font-family)',
  borderRadius: `${normalizedAppearance.value.bubbleRadius}px`,
  padding: `${normalizedAppearance.value.bubblePaddingY}px ${normalizedAppearance.value.bubblePaddingX}px`,
}))

const messageTextStyle = computed(() => ({
  fontSize: `${normalizedAppearance.value.messageFontSize}px`,
  lineHeight: 1.6,
}))

const userBubbleStyle = computed(() => ({
  ...bubbleBaseStyle.value,
  fontFamily: normalizedAppearance.value.fontFamily || 'var(--message-font-family)',
  backgroundColor: hexToRgba(normalizedAppearance.value.userBubbleColor, normalizedAppearance.value.opacity),
  borderColor: hexToRgba(normalizedAppearance.value.userBubbleColor, 0.45),
  color: 'var(--foreground)',
}))

const assistantBubbleStyle = computed(() => ({
  ...bubbleBaseStyle.value,
  fontFamily: normalizedAppearance.value.fontFamily || 'var(--message-font-family)',
  backgroundColor: hexToRgba(normalizedAppearance.value.assistantBubbleColor, normalizedAppearance.value.opacity),
  borderColor: hexToRgba(normalizedAppearance.value.assistantBubbleColor, 0.35),
  color: 'var(--foreground)',
}))

const functionCallStyle = computed(() => ({
  fontSize: `${normalizedAppearance.value.functionCallFontSize}px`,
  lineHeight: 1.5,
  fontFamily: normalizedAppearance.value.fontFamily || 'var(--message-font-family)',
  color: 'var(--foreground)',
}))

const codeSampleStyle = computed(() => ({
  fontSize: `${Math.max(normalizedAppearance.value.functionCallFontSize - 1, 10)}px`,
  lineHeight: 1.5,
  fontFamily: normalizedAppearance.value.fontFamily || 'var(--message-font-family)',
  color: 'var(--foreground)',
}))

const thoughtStyle = computed(() => ({
  fontSize: `${normalizedAppearance.value.thoughtFontSize}px`,
  lineHeight: 1.55,
  fontFamily: normalizedAppearance.value.fontFamily || 'var(--message-font-family)',
  color: 'var(--foreground)',
}))

const previewImageStyle = computed(() => ({
  width: `${normalizedAppearance.value.imageWidthPercent ?? 100}%`,
  maxWidth: '100%',
  height: 'auto',
  borderRadius: `${Math.max(normalizedAppearance.value.bubbleRadius - 4, 4)}px`,
  border: '1px solid color-mix(in srgb, var(--foreground) 12%, transparent)',
  backgroundColor: 'var(--background)',
  display: 'block',
  marginInlineStart: getMargins(normalizedAppearance.value.imageJustify).start,
  marginInlineEnd: getMargins(normalizedAppearance.value.imageJustify).end,
}))

function getMargins(justify: 'start' | 'center' | 'end') {
  switch (justify) {
    case 'center':
      return { start: 'auto', end: 'auto' }
    case 'end':
      return { start: 'auto', end: '0' }
    case 'start':
    default:
      return { start: '0', end: 'auto' }
  }
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
