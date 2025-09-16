<template>
  <div class="border-border bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
    <div :class="['flex items-start gap-4', isOpen ? 'mb-6' : 'mb-0']">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="text-muted-foreground hover:text-foreground rounded-lg"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? 'Collapse section' : 'Expand section'"
        @click="toggleSection"
      >
        <ChevronDown
          class="h-4 w-4 transition-transform duration-200"
          :class="isOpen ? 'rotate-0' : '-rotate-90'"
        />
      </Button>
      <div class="flex-1">
        <h2 class="text-foreground mb-2 text-xl font-semibold">
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="text-muted-foreground text-sm"
        >
          {{ description }}
        </p>
      </div>
    </div>

    <div
      v-show="isOpen"
      :class="singleColumn ? 'space-y-6' : 'grid gap-6 md:grid-cols-2'"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { ref } from 'vue'
import { Button } from '~/components/ui/button'

export interface SettingSectionProps {
  title: string
  description?: string
  singleColumn?: boolean
}

withDefaults(defineProps<SettingSectionProps>(), {
  description: undefined,
  singleColumn: false,
})

const isOpen = ref(true)

const toggleSection = () => {
  isOpen.value = !isOpen.value
}
</script>
