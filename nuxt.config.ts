// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import type { NitroConfig } from 'nitropack'

export default defineNuxtConfig({
  srcDir: 'app',
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@pinia-plugin-persistedstate/nuxt', '@vite-pwa/nuxt', 'shadcn-nuxt'],

  devtools: { enabled: process.env.NODE_ENV === 'development' },

  ssr: false,

  app: {
    head: {
      title: process.env.NODE_ENV === 'development' ? `Gemini PWA Vue (${process.env.NODE_ENV})` : 'Gemini PWA Vue',
      meta: [
        { name: 'description', content: 'Gemini PWA Vue' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  runtimeConfig: {
    public: {
      persistedState: {
        cookieOptions: {},
      },
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-09-16',

  nitro: {
    prerender: {
      routes: ['/'],
      crawlLinks: true,
      ignore: ['/components-test'],
    },
    security: {
      headers: {
        contentSecurityPolicy: {
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'font-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'", 'https://generativelanguage.googleapis.com'],
        },
      },
    },
  } as NitroConfig,

  typescript: {
    tsConfig: {
      exclude: ['service-worker'],
    },
    typeCheck: true,
  },
  css: ['~/assets/css/main.css'],
  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'prompt',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      id: '/',
      name: 'Gemini PWA Vue',
      short_name: 'GPV',
      description: 'Gemini PWA Vue',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      icons: [
        {
          src: 'pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png',
        },
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      theme_color: '#ffffff',
      display_override: ['standalone'],
    },

    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    },

    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallback: '/',
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module',
    },

    registerWebManifestInRouteRules: true,

    client: {
      periodicSyncForUpdates: 3600,
      installPrompt: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: false,
    },
  },
})
