<template>
  <div class="border-border mt-3 border-t pt-3">
    <details
      class="group"
      :open="open"
    >
      <summary
        class="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors duration-200 select-none"
        :style="summaryStyle"
      >
        <Icon
          :icon="icon"
          class="text-primary h-4 w-4"
        />
        {{ label }}
        <Icon
          icon="material-symbols:expand-more"
          class="h-4 w-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <div
        class="border-border bg-muted/70 text-foreground mt-2 rounded-md border p-3"
        :style="bodyStyle"
      >
        <slot>
          {{ text }}
        </slot>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text?: string | null
    fontSize?: number
    open?: boolean
    label?: string
    icon?: string
  }>(),
  {
    text: '',
    fontSize: 13,
    open: false,
    label: '思考プロセス',
    icon: 'material-symbols:psychology',
  }
)

const summaryStyle = computed(() => ({
  fontSize: `${props.fontSize}px`,
  fontFamily: 'var(--message-font-family)',
  fontWeight: 500,
}))

const bodyStyle = computed(() => ({
  fontSize: `${props.fontSize}px`,
  fontFamily: 'var(--message-font-family)',
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
}))
</script>
