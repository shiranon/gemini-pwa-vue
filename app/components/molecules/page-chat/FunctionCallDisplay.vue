<template>
  <details
    class="border-border bg-muted/70 mt-3 rounded-lg border transition-colors duration-200"
    :open="isOpen"
    :style="functionCallStyle"
    @toggle="onToggle"
  >
    <summary class="text-muted-foreground hover:bg-muted hover:text-foreground flex cursor-pointer items-center gap-2 rounded-t-lg px-3 py-2 font-medium transition-colors select-none">
      <Icon
        icon="material-symbols:settings"
        class="text-primary h-4 w-4"
      />
      ツール使用 ({{ functionCalls.length }}件)
    </summary>
    <ul class="list-none space-y-3 p-3 pt-0">
      <li
        v-for="(call, index) in functionCalls"
        :key="`${call.name}-${index}`"
        class="border-border bg-card rounded-md border p-3 shadow-sm transition-colors"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-primary font-mono font-semibold">{{ call.name }}</span>
          <span
            v-if="getResult(index)?.executionTime"
            class="bg-muted text-muted-foreground rounded px-2 py-1 text-xs"
          >
            {{ getResult(index)?.executionTime }}ms
          </span>
        </div>

        <div
          v-if="hasArgs(call.args)"
          class="mb-2"
        >
          <strong class="text-foreground font-medium">引数:</strong>
          <pre
            class="border-border bg-muted/80 text-foreground mt-1 overflow-x-auto rounded border p-2"
            :style="codeBlockStyle"
            >{{ formatArgs(call.args) }}</pre
          >
        </div>

        <div
          v-if="getResult(index)"
          class="mt-2"
        >
          <div
            v-if="getResult(index)?.error"
            class="text-destructive flex items-start gap-2"
          >
            <Icon
              icon="material-symbols:error"
              class="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <span>エラー: {{ getResult(index)?.error }}</span>
          </div>
          <div
            v-else
            class="text-primary"
          >
            <Icon
              icon="material-symbols:check-circle"
              class="text-primary mr-2 inline h-4 w-4"
            />
            <pre
              class="border-primary/40 bg-primary/10 text-primary mt-1 overflow-x-auto rounded border p-2"
              :style="codeBlockStyle"
              >{{ formatResult(getResult(index)?.result) }}</pre
            >
          </div>
        </div>
      </li>
    </ul>
  </details>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import type { FunctionCall, FunctionCallResult } from '~/types/function-calling'
import { useSettingsStore } from '~/stores/settings'
import { storeToRefs } from 'pinia'

interface Props {
  functionCalls: FunctionCall[]
  functionResults?: FunctionCallResult[]
  open?: boolean
  fontSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

const isOpen = ref(props.open)

watch(
  () => props.open,
  (value) => {
    if (typeof value === 'boolean') {
      isOpen.value = value
    }
  },
  { immediate: true }
)

const settingsStore = useSettingsStore()
const { messageAppearanceSettings } = storeToRefs(settingsStore)

const effectiveFontSize = computed(() => props.fontSize ?? messageAppearanceSettings.value.functionCallFontSize)

const functionCallStyle = computed(() => ({
  fontSize: `${effectiveFontSize.value}px`,
  fontFamily: 'var(--message-font-family)',
  lineHeight: 1.55,
}))

const codeBlockStyle = computed(() => ({
  fontSize: `${Math.max(effectiveFontSize.value - 1, 10)}px`,
  fontFamily: 'var(--message-font-family)',
  lineHeight: 1.55,
}))

const onToggle = (event: Event) => {
  const target = event.target as HTMLDetailsElement
  isOpen.value = target.open
}

/**
 * 指定されたインデックスの実行結果を取得
 */
const getResult = (index: number): FunctionCallResult | undefined => {
  return props.functionResults?.[index]
}

/**
 * 引数が存在するかチェック
 */
const hasArgs = (args: Record<string, unknown>): boolean => {
  return Object.keys(args).length > 0
}

/**
 * 引数を読みやすい形式でフォーマット
 */
const formatArgs = (args: Record<string, unknown>): string => {
  return JSON.stringify(args, null, 2)
}

/**
 * 実行結果を読みやすい形式でフォーマット
 */
const formatResult = (result: unknown): string => {
  if (typeof result === 'string') {
    return result
  }
  return JSON.stringify(result, null, 2)
}
</script>
