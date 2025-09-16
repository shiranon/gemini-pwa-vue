<template>
  <div
    class="border-border bg-card text-card-foreground fixed right-4 bottom-4 z-50 max-w-80 rounded-lg border p-4 shadow-[0_25px_50px_rgba(15,23,42,0.15)] shadow-lg"
    role="alert"
    :aria-labelledby="ariaLabelId"
  >
    <div class="mb-2 flex items-center">
      <Icon
        v-if="type === 'update'"
        icon="material-symbols:info"
        class="text-primary mr-2"
      />
      <Icon
        v-else-if="type === 'install'"
        icon="material-symbols:download"
        class="text-primary mr-2"
      />
      <span
        :id="ariaLabelId"
        class="text-muted-foreground text-sm"
      >
        {{ message }}
      </span>
    </div>
    <div class="flex justify-end gap-2">
      <Button
        v-if="showPrimaryAction"
        variant="default"
        size="sm"
        @click="$emit('primary-action')"
      >
        {{ primaryActionLabel }}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        @click="$emit('secondary-action')"
      >
        {{ secondaryActionLabel }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'

interface Props {
  type: 'update' | 'install'
  message: string
  showPrimaryAction?: boolean
  primaryActionLabel?: string
  secondaryActionLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  showPrimaryAction: true,
  primaryActionLabel: '更新',
  secondaryActionLabel: '閉じる',
})

defineEmits<{
  'primary-action': []
  'secondary-action': []
}>()

const ariaLabelId = computed(() => `${props.type}-message`)
</script>
