<template>
  <div class="flex min-h-[300px] flex-col items-center justify-center py-12 text-center">
    <div class="border-border bg-muted/50 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border">
      <Icon
        :icon="icon"
        class="text-muted-foreground h-10 w-10"
      />
    </div>
    <h3 class="mb-2 text-lg font-semibold">{{ title }}</h3>
    <p class="text-muted-foreground mb-4">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  icon: string
  title: string
  description: string
}

defineProps<Props>()
</script>
