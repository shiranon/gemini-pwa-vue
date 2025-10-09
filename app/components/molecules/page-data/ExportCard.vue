<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg"
          :class="iconBgClass"
        >
          <component
            :is="IconComponent"
            class="h-6 w-6"
          />
        </div>
        <div>
          <CardTitle class="text-sm">{{ title }}</CardTitle>
          <CardDescription class="text-xs">{{ subtitle }}</CardDescription>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <StatsList
        v-if="showStats && stats && databaseSize"
        :stats="stats"
        :database-size="databaseSize"
      />

      <p
        v-if="description"
        class="text-muted-foreground mb-4 text-sm"
      >
        {{ description }}
      </p>

      <Button
        :disabled="disabled"
        variant="default"
        class="w-full"
        :class="buttonClass"
        @click="$emit('export')"
      >
        <component
          :is="ButtonIconComponent"
          class="mr-2 h-4 w-4"
        />
        {{ buttonText }}
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Download, MessageSquare, FileText, Database, HardDrive } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/ui/card'
import StatsList from './StatsList.vue'

interface DatabaseStats {
  totalChats: number
  totalMessages: number
}

interface Props {
  title: string
  subtitle: string
  icon: string
  iconBgClass: string
  showStats?: boolean
  stats?: DatabaseStats | null
  databaseSize?: string
  description?: string
  buttonText: string
  buttonIcon: string
  buttonClass: string
  disabled: boolean
}

const props = defineProps<Props>()
defineEmits<{
  export: []
}>()

// アイコンマッピング
const iconMap = {
  'material-symbols:download': Download,
  'material-symbols:chat': MessageSquare,
  'material-symbols:file-save': FileText,
  'material-symbols:storage': Database,
  'material-symbols:hard-drive': HardDrive,
  'material-symbols:message': MessageSquare,
}

// 動的にアイコンコンポーネントを取得
const IconComponent = computed(() => {
  return iconMap[props.icon as keyof typeof iconMap] || Download
})

const ButtonIconComponent = computed(() => {
  return iconMap[props.buttonIcon as keyof typeof iconMap] || Download
})
</script>
