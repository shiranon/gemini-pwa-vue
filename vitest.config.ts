import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    env: {
      NODE_ENV: 'test',
    },
    deps: {
      inline: ['@nuxt/test-utils'],
    },
  },
  resolve: {
    alias: {
      '~': new URL('./app', import.meta.url).pathname,
    },
  },
})
