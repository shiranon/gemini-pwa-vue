<template>
  <div class="flex items-start justify-between space-x-2">
    <div class="flex-1 space-y-0.5">
      <Label
        :for="toggleId"
        class="text-foreground text-sm font-medium"
      >
        {{ props.label }}
        <span
          v-if="props.required"
          class="text-destructive ml-1"
          >*</span
        >
      </Label>
      <p
        v-if="props.description"
        class="text-muted-foreground text-xs"
      >
        {{ props.description }}
      </p>
      <div
        v-if="$slots.help"
        class="text-muted-foreground mt-2 text-xs"
      >
        <slot name="help" />
      </div>
    </div>

    <Switch
      :id="toggleId"
      :model-value="props.modelValue"
      :disabled="props.disabled"
      @update:model-value="handleSwitchChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'

const handleSwitchChange = (checked: boolean) => {
  emit('update:modelValue', checked)
}

const props = defineProps<SettingToggleProps>()

export interface SettingToggleProps {
  modelValue: boolean
  label: string
  description?: string
  required?: boolean
  disabled?: boolean
}

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const toggleId = computed(() => {
  return `toggle-${Math.random().toString(36).substring(2, 11)}`
})
</script>
