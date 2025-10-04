<template>
  <section
    v-if="!settingsStore.navigationSettings.hideSystemPromptInChat"
    class="border-border bg-card text-card-foreground sticky top-0 z-10 mb-4 rounded-lg border p-4 shadow-sm"
  >
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-foreground text-base font-semibold">チャット固有のシステムプロンプト</h3>
      <div class="flex gap-2">
        <Button
          v-if="!chatStore.isEditingSystemPrompt"
          size="sm"
          variant="outline"
          @click="startEdit()"
        >
          編集
        </Button>
        <template v-else>
          <Button
            size="sm"
            :disabled="savingPrompt"
            @click="savePrompt()"
          >
            保存
          </Button>
          <Button
            size="sm"
            variant="ghost"
            :disabled="savingPrompt"
            @click="cancelEdit()"
          >
            キャンセル
          </Button>
        </template>
      </div>
    </div>
    <div v-if="chatStore.isEditingSystemPrompt">
      <Textarea
        v-model="localPrompt"
        :rows="6"
        placeholder="このチャット用の役割や方針を記述..."
        class="w-full"
      />
    </div>
    <div
      v-else
      class="border-border bg-muted text-foreground rounded-md border p-3 whitespace-pre-wrap"
    >
      {{ chatStore.systemPrompt.slice(0, 100) + (chatStore.systemPrompt.length > 100 ? '...' : '') || '（未設定）' }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()

const localPrompt = ref('')
const savingPrompt = ref(false)

// システムプロンプト編集関連の関数
watch(
  () => chatStore.currentSession?.id,
  () => {
    localPrompt.value = chatStore.systemPrompt || ''
  },
  { immediate: true }
)

const startEdit = () => {
  localPrompt.value = chatStore.systemPrompt || ''
  chatStore.startEditingSystemPrompt()
}

const cancelEdit = () => {
  chatStore.cancelEditingSystemPrompt()
  localPrompt.value = chatStore.systemPrompt || ''
}

const savePrompt = async () => {
  if (!chatStore.currentSession) return
  try {
    savingPrompt.value = true
    await chatStore.saveSystemPrompt(localPrompt.value)
  } finally {
    savingPrompt.value = false
  }
}
</script>
