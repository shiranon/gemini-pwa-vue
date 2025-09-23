<template>
  <div class="border-border/60 bg-card/95 text-card-foreground supports-[backdrop-filter]:bg-card/80 sticky top-18 z-10 rounded-2xl border p-6 shadow-md backdrop-blur">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-foreground text-xl font-bold">設定</h1>

      <div class="flex items-center gap-2">
        <Button
          v-if="isDirty"
          variant="default"
          :disabled="saving"
          @click="$emit('save')"
        >
          <Icon
            v-if="saving"
            icon="material-symbols:refresh"
            class="h-4 w-4 animate-spin"
          />
          <Icon
            v-else
            icon="material-symbols:save"
            class="h-4 w-4"
          />
          {{ saving ? '保存中...' : '設定を保存' }}
        </Button>

        <Button
          variant="secondary"
          @click="$emit('reset')"
        >
          <Icon
            icon="material-symbols:refresh"
            class="h-4 w-4"
          />
          リセット
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'

export interface SettingsHeaderProps {
  /** 変更があるかどうか */
  isDirty: boolean
  /** 保存中かどうか */
  saving?: boolean
}

withDefaults(defineProps<SettingsHeaderProps>(), {
  saving: false,
})

defineEmits<{
  save: []
  reset: []
}>()
</script>
