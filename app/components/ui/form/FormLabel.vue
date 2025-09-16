<script lang="ts" setup>
import type { LabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { useFormField } from './useFormField'

const props = defineProps<LabelProps & { class?: HTMLAttributes['class'] }>()

const { error, formItemId, formLabelId } = useFormField()

const handleClick = (event: MouseEvent) => {
  event.preventDefault()

  if (typeof document === 'undefined') return

  const element = document.getElementById(formItemId)
  if (!(element instanceof HTMLElement)) return

  if (typeof element.focus === 'function') {
    element.focus({ preventScroll: true })
  }

  if (typeof element.click === 'function') {
    element.click()
  }
}
</script>

<template>
  <Label
    :id="formLabelId"
    data-slot="form-label"
    :data-error="!!error"
    :class="cn('data-[error=true]:text-destructive-foreground', props.class)"
    @click="handleClick"
  >
    <slot />
  </Label>
</template>
