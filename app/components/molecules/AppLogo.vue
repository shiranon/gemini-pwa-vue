<template>
  <div class="flex w-full items-center">
    <div class="mr-3">
      <Icon
        icon="material-symbols:chat"
        class="text-primary h-8 w-8"
      />
    </div>
    <h1 class="text-foreground m-0 text-xl font-semibold">
      {{ title }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  title: string
}

defineProps<Props>()
</script>
