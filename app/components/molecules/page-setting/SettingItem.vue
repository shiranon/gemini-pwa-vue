<template>
  <div
    v-if="standalone"
    class="space-y-2"
  >
    <div
      v-if="label"
      class="flex items-center gap-2"
    >
      <Button
        v-if="collapsible"
        type="button"
        variant="ghost"
        size="icon"
        class="text-muted-foreground hover:text-foreground"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? 'Collapse setting' : 'Expand setting'"
        @click="toggle"
      >
        <ChevronDown
          class="h-4 w-4 transition-transform duration-200"
          :class="isOpen ? 'rotate-0' : '-rotate-90'"
        />
      </Button>
      <div class="flex flex-1 items-center gap-2">
        <label
          class="text-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          :class="collapsible ? 'cursor-pointer' : ''"
          @click="handleLabelClick"
        >
          {{ label }}
          <span
            v-if="required"
            class="text-destructive"
            >*</span
          >
        </label>
        <span
          v-if="value && showValue"
          class="bg-muted text-muted-foreground ml-auto rounded px-2 py-0.5 text-xs font-normal"
        >
          {{ formatValue(value) }}
        </span>
      </div>
    </div>

    <div class="relative">
      <div v-show="!collapsible || isOpen">
        <slot />
      </div>

      <div
        v-if="showStatusIndicator && (!collapsible || isOpen)"
        class="absolute inset-y-0 right-0 flex items-center pr-3"
      >
        <div
          :class="['h-2 w-2 rounded-full', isValid ? 'bg-primary' : 'bg-destructive']"
          :title="isValid ? validMessage : invalidMessage"
        />
      </div>
    </div>

    <p
      v-if="description"
      class="text-muted-foreground text-sm"
    >
      {{ description }}
    </p>
  </div>

  <FormField
    v-else
    :name="inputId"
  >
    <FormItem>
      <div
        v-if="label"
        class="flex items-center gap-2"
      >
        <Button
          v-if="collapsible"
          type="button"
          variant="ghost"
          size="icon"
          class="text-muted-foreground hover:text-foreground"
          :aria-expanded="isOpen"
          :aria-label="isOpen ? 'Collapse setting' : 'Expand setting'"
          @click="toggle"
        >
          <ChevronDown
            class="h-4 w-4 transition-transform duration-200"
            :class="isOpen ? 'rotate-0' : '-rotate-90'"
          />
        </Button>
        <FormLabel :for="inputId">
          <div
            class="flex flex-1 items-center gap-2"
            @click="handleLabelClick"
          >
            <span class="text-foreground">{{ label }}</span>
            <span
              v-if="required"
              class="text-destructive"
              >*</span
            >
            <span
              v-if="value && showValue"
              class="bg-muted text-muted-foreground ml-auto rounded px-2 py-0.5 text-xs font-normal"
            >
              {{ formatValue(value) }}
            </span>
          </div>
        </FormLabel>
      </div>

      <FormControl>
        <div class="relative">
          <div v-show="!collapsible || isOpen">
            <slot />
          </div>

          <div
            v-if="showStatusIndicator && (!collapsible || isOpen)"
            class="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <div
              :class="['h-2 w-2 rounded-full', isValid ? 'bg-primary' : 'bg-destructive']"
              :title="isValid ? validMessage : invalidMessage"
            />
          </div>
        </div>
      </FormControl>

      <FormDescription v-if="description">
        {{ description }}
      </FormDescription>

      <FormMessage />
    </FormItem>
  </FormField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField } from '~/components/ui/form'
import { Button } from '~/components/ui/button'

export interface SettingItemProps {
  name?: string
  label?: string
  description?: string
  required?: boolean
  value?: string | number
  showValue?: boolean
  valueFormatter?: (value: string | number) => string
  showStatusIndicator?: boolean
  isValid?: boolean
  validMessage?: string
  invalidMessage?: string
  standalone?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<SettingItemProps>(), {
  name: undefined,
  label: undefined,
  description: undefined,
  required: false,
  value: undefined,
  showValue: false,
  valueFormatter: undefined,
  showStatusIndicator: false,
  isValid: true,
  validMessage: '設定済み',
  invalidMessage: '未設定',
  standalone: false,
  collapsible: false,
  defaultOpen: true,
})

const inputId = computed(() => {
  if (props.name) {
    return props.name
  }
  if (props.label) {
    return `setting-${props.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
  }
  return `setting-unknown-${Date.now()}`
})

const formatValue = (value: string | number) => {
  if (props.valueFormatter) {
    return props.valueFormatter(value)
  }
  return String(value)
}

const isOpen = ref(!props.collapsible || props.defaultOpen)

const toggle = () => {
  if (!props.collapsible) return
  isOpen.value = !isOpen.value
}

const handleLabelClick = () => {
  if (!props.collapsible) return
  toggle()
}
</script>
