<template>
  <Card>
    <CardContent class="pt-6">
      <Alert variant="destructive">
        <AlertTitle>{{ title }}</AlertTitle>
        <AlertDescription>
          {{ description }}
        </AlertDescription>
      </Alert>

      <div class="mt-4">
        <Button
          :disabled="disabled"
          variant="destructive"
          @click="$emit('action')"
        >
          <Icon
            :icon="icon"
            class="mr-2 h-4 w-4"
          />
          {{ buttonText }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '~/components/ui/alert'

interface Props {
  title: string
  description: string
  icon: string
  buttonText: string
  disabled: boolean
}

defineProps<Props>()
defineEmits<{
  action: []
}>()
</script>
