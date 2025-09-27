<template>
  <Button
    variant="outline"
    class="h-20 flex-col gap-2 px-2"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <component
      :is="icon"
      class="h-5 w-5"
    />
    <span class="text-xs font-medium">{{ label }}</span>
    <span
      v-if="description"
      class="text-muted-foreground text-[10px]"
    >
      {{ description }}
    </span>
  </Button>
</template>

<script setup lang="ts">
import type { markRaw } from 'vue'
import { Button } from '~/components/ui/button'

interface Props {
  icon: ReturnType<typeof markRaw>
  label: string
  description?: string
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit('click')
  }
}
</script>
