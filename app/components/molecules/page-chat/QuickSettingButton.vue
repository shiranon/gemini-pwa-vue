<template>
  <button
    class="group bg-background hover:border-primary relative flex flex-col items-center justify-center rounded-lg border p-2 transition-all hover:shadow-md sm:p-4"
    :class="{
      'border-primary bg-primary/10': enabled,
      'border-border': !enabled,
    }"
    :title="`${description} (${enabled ? 'クリックで無効化' : 'クリックで有効化'})`"
    :aria-pressed="enabled"
    :aria-label="`${label}: ${enabled ? '有効' : '無効'}`"
    @click="handleClick"
  >
    <div class="relative mb-2">
      <component
        :is="icon"
        class="h-8 w-8 transition-colors"
        :class="{
          'text-primary': enabled,
          'text-muted-foreground': !enabled,
        }"
      />
      <div
        v-if="enabled"
        class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500"
      />
    </div>
    <span
      class="text-center text-xs font-medium"
      :class="{
        'text-primary': enabled,
        'text-muted-foreground': !enabled,
      }"
    >
      {{ label }}
    </span>
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  icon: Component
  label: string
  enabled: boolean
  description: string
}

defineProps<Props>()

const emit = defineEmits<{
  toggle: []
}>()

const handleClick = () => {
  emit('toggle')
}
</script>
