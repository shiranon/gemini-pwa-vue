# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Nuxt 3 Progressive Web App for Gemini interactions. The project has been refactored from an older JavaScript structure to a modern Vue 3/Nuxt 3 TypeScript setup with PWA capabilities.

## Development Commands

### Essential Commands
- `bun install` - Install dependencies
- `bun run dev` - Start development server on http://localhost:8888
- `bun run build` - Build for production 
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Run ESLint
- `bun run generate` - Generate static site
- `bun run preview` - Preview production build
- `bun run generate-pwa-assets` - Generate PWA assets from icon.png

### Package Manager
This project uses **Bun** as the package manager. Always use `bun` commands instead of npm/yarn/pnpm.

## Architecture and Structure

### Directory Structure
```
app/                     # Nuxt 3 app directory (main source)
├── assets/css/         # Global CSS (TailwindCSS imports)
├── components/         # Vue components (atomic design structure)
│   ├── molecules/      # Component combinations
│   │   ├── page-chat/  # Chat interface molecules
│   │   ├── page-data/  # Data management molecules
│   │   ├── page-history/ # History page molecules
│   │   ├── page-setting/ # Settings page molecules
│   │   ├── layout/     # Layout molecules
│   │   ├── dialogs/    # Dialog molecules
│   │   └── *           # Shared/legacy molecules (AppLogo, FileUpload, etc.)
│   ├── organisms/      # Complex components
│   │   ├── page-chat/  # Chat page organisms
│   │   ├── page-data/  # Data management organisms
│   │   ├── page-history/ # History page organisms
│   │   ├── page-setting/ # Settings page organisms
│   │   └── layout/     # Layout organisms
│   └── ui/             # shadcn-vue UI components (atoms)
├── composables/        # Vue composables for API integration
├── layouts/            # Vue layouts
├── pages/              # Vue pages/routes
├── service-worker/     # PWA service worker
├── stores/             # Pinia store modules
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (includes database layer)
└── app.vue             # Root Vue component

public/                 # Static assets
server/                 # Server-side code
```

### Key Technologies
- **Nuxt 3** - Vue.js framework with SSR/SSG
- **Vue 3** with Composition API and `<script setup>` syntax
- **TypeScript** - Strict typing throughout
- **TailwindCSS v4** - Utility-first CSS framework
- **Pinia** - State management with persistence
- **PWA** - Progressive Web App with Workbox service worker
- **Vite** - Build tool and dev server

### State Management & Data Layer
- **Pinia Stores**: Located in `app/stores/` directory
  - Configured with persistence via `pinia-plugin-persistedstate`
  - Store modules follow Pinia composition API patterns
  - Used for lightweight settings and UI state (localStorage)
- **IndexedDB Database**: Sophisticated data layer using DexieJS
  - Database class defined in `app/utils/database.ts`
  - Handles chat history, messages, and file attachments
  - Composables in `app/composables/` provide database operations
- **Composables Pattern**: Vue composables for API integrations
  - Prefix naming convention with `use` (e.g., `useSettings`, `useDatabase`)
  - Auto-imported via Nuxt's composables system

### PWA Configuration
- Custom service worker in `app/service-worker/sw.ts`
- Uses `injectManifest` strategy for full SW control
- PWA assets generated via `@vite-pwa/assets-generator`
- Install prompts and update notifications in default layout

## Code Standards

### ESLint Configuration
- Uses `@nuxt/eslint-config` with custom rules
- Prettier integration with 200-char print width
- Console logs are allowed (`no-console: off`)
- Ignores `old/**/*` directory

### Prettier Configuration
- No semicolons (`semi: false`)
- Single quotes (`singleQuote: true`)
- 2-space indentation
- Single attribute per line in Vue templates
- TailwindCSS class sorting enabled

### TypeScript
- Strict TypeScript throughout
- Type checking runs in pre-commit hooks
- Excludes service worker from main tsconfig

## Development Workflow

### Git Hooks (Lefthook)
Pre-commit hooks run automatically:
1. TypeScript type checking
2. ESLint linting  
3. Production build verification

### File Conventions & Patterns  
- Vue components use `<script setup lang="ts">` syntax
- Store modules in TypeScript with Pinia composition API
- Service worker uses Workbox for caching strategies
- CSS uses TailwindCSS utilities exclusively
- All imports use absolute paths with `~/` prefix
- Type definitions centralized in `app/types/` directory

### PWA Development
- Service worker auto-reloads during development
- PWA install prompts handled in default layout
- Offline functionality via Workbox precaching
- Custom navigation routing for SPA behavior

## Important Notes

### Build Process
The project uses Nuxt 3's build system with PWA manifest injection. The service worker is built separately and injected with precache manifest.

**Important**: This is configured as a Single Page Application (SPA) with `ssr: false` for optimal PWA performance.

### Environment Configuration
- Development tools enabled only in development environment
- Runtime config available via `useRuntimeConfig()`
- PWA dev options disabled by default for production-like testing

## Refactoring Standards

### TailwindCSS v4 Compliance
- **@apply directive is PROHIBITED** - Use utility classes directly in HTML/Vue templates
- Prepare for v4 where @apply will be removed
- All styling must use utility classes exclusively

### Icon Management
**Primary**: Lucide icons via shadcn-vue components
- Configured in `components.json`
- Used by shadcn-vue UI components
- Imported from `lucide-vue-next` package

**Alternative**: Iconify with Material Symbols
- Use Iconify Vue component (`@iconify/vue`) for additional icons
- Material Symbols by Google as supplementary icon set
- Format: `<Icon icon="material-symbols:name" />`
- Build-time bundling for offline support via CDN
- Only `@iconify/vue` package is required - icons load automatically

#### Iconify Vue Usage Reference
```vue
<script setup>
import { Icon } from '@iconify/vue'
</script>

<template>
  <!-- Basic usage -->
  <Icon icon="material-symbols:home" />
  
  <!-- With size and color -->
  <Icon icon="material-symbols:settings" width="24" height="24" color="#666" />
  
  <!-- With styling -->
  <Icon icon="material-symbols:menu" class="text-blue-500 w-6 h-6" />
  
  <!-- SSR safe (for Nuxt) -->
  <Icon icon="material-symbols:loading" :ssr="true" />
</template>
```

#### Icon Name Format
- Structure: `icon-set:icon-name`
- Material Symbols: `material-symbols:name`
- Examples: `material-symbols:home`, `material-symbols:settings-outline-rounded`
- Browse icons: https://icon-sets.iconify.design/material-symbols/

### Atomic Design Component Structure
- **Molecules**: Page-specific organization
  - `molecules/page-chat/`: Chat interface molecules (MessageBubble, ImageModal parts, etc.)
  - `molecules/page-data/`: Data management molecules (DropZone, ImportOptions, etc.)
  - `molecules/page-history/`: History page molecules (HistoryFilters, HistoryStats, etc.)
  - `molecules/page-setting/`: Settings page molecules (SettingSection, SettingItem, etc.)
  - `molecules/layout/`: Layout molecules (AppHeader, PWANotification)
  - `molecules/dialogs/`: Dialog components (AlertDialog, ConfirmDialog, etc.)
  - `molecules/*`: Shared/legacy molecules (AppLogo, FileUpload, DesktopNavigation, MobileNavigation)
- **Organisms**: Page-specific organization
  - `organisms/page-chat/`: Chat page organisms (ChatInterface, ImageModal)
  - `organisms/page-data/`: Data management organisms (ImportSection, ExportSection, etc.)
  - `organisms/page-history/`: History page organisms (HistoryContent, HistoryItem, etc.)
  - `organisms/page-setting/`: Settings page organisms (ApiSettingsSection, UiSettingsSection, etc.)
  - `organisms/layout/`: Layout organisms (DefaultLayout)
- **UI (Atoms)**: shadcn-vue components (Button, Input, Dialog, etc.)

### Component Replacement Standards

- **shadcn-vue is the default standard** - No need for "WithShadcn" or similar suffixes
- **Safe replacement workflow:**
  1. Rename old component to `ComponentName_old.vue`
  2. Implement new shadcn-vue standard component as `ComponentName.vue`
  3. Test and verify new component works correctly
  4. Delete the `_old` file after successful migration
- **Always follow shadcn-vue recommended patterns** - v-model based control, proper separation of concerns

## Gemini API Integration

### @google/generative-ai Library
This project uses the official `@google/generative-ai` library for Gemini API integration:

- **Primary Interface**: `useGeminiApi()` composable in `app/composables/useGeminiApi.ts`
- **Methods**:
  - `generateContent()` - Non-streaming content generation
  - `generateContentStream()` - Streaming content generation with async generator
  - `validateApiKey()` - API key validation
  - `getAvailableModels()` - Available model listing
  - `createGeminiClient()` - Client instance creation

### Usage Examples
```typescript
const { generateContent, generateContentStream } = useGeminiApi()

// Non-streaming
const response = await generateContent(messages, config, systemInstruction, settings)

// Streaming
for await (const chunk of generateContentStream(messages, config, systemInstruction, settings)) {
  console.log(chunk.contentText)
}
```

### Quality Gates (MANDATORY)
After every code change, run:
```bash
bun lint --fix    # Auto-fix linting issues
bun typecheck     # Verify TypeScript types
bun run build         # Confirm production build
```

### local development
Read `CLAUDE.local.md` file