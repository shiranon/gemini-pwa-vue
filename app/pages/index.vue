<template>
  <div class="mx-auto w-full max-w-5xl flex-1 items-center justify-between px-2">
    <div
      v-if="chatStore.isSaving"
      class="fixed top-4 right-4 z-40 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white shadow-lg"
    >
      保存中...
    </div>

    <ChatInterface />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '~/stores/chat'
import ChatInterface from '~/components/organisms/page-chat/ChatInterface.vue'

const chatStore = useChatStore()

onMounted(async () => {
  await chatStore.initialize()
})
</script>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

@media (prefers-color-scheme: dark) {
  .chat-page {
    background: #0f172a;
  }
}
</style>
