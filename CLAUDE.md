# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A Nuxt 3 Progressive Web App for Gemini AI chat interactions, specifically designed for TRPG (tabletop role-playing game) scenarios. This is a complete Vue.js rewrite of the original [Gemini PWA Client Mk-II](https://github.com/kinkan04/Gemini-PWA-Mk-II), featuring modern TypeScript architecture and enhanced PWA capabilities.

**Live Demo**: [gemini-pwa-vue.vercel.app](https://gemini-pwa-vue.vercel.app)

## Development Commands

### Essential Commands
- `bun install` - Install dependencies
- `bun run dev` - Start development server on http://localhost:8888
- `bun run build` - Build for production
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Run ESLint
- `bun lint --fix` - Auto-fix ESLint issues
- `bun format:fix` - Format code with Prettier
- `bun run test` - Run all Vitest tests with TZ=Asia/Tokyo
- `bun test [file]` - Run specific test file (e.g., `bun test rollDice.spec.ts`)
- `bun run check-all` - Run lint --fix, typecheck, and test in sequence
- `bun run generate` - Generate static site
- `bun run preview` - Preview production build on http://localhost:8880
- `bun run generate-pwa-assets` - Generate PWA assets from public/icon.png

### Package Manager
**Bun** is the required package manager. Always use `bun` commands instead of npm/yarn/pnpm.

## Architecture Overview

### Core Technologies
- **Nuxt 3** - Vue.js meta-framework configured as SPA (`ssr: false`)
- **Vue 3** - Composition API with `<script setup lang="ts">` syntax
- **TypeScript** - Strict typing throughout
- **TailwindCSS v4** - Utility-first CSS (@apply directive prohibited)
- **Pinia** - State management with persistence
- **IndexedDB/Dexie** - Persistent data storage for chat history
- **PWA/Workbox** - Service worker with offline capabilities
- **Vitest** - Unit testing framework

### Directory Structure
```
app/                     # Nuxt 3 app directory (main source)
├── assets/css/         # Global CSS (TailwindCSS imports)
├── components/         # Vue components (atomic design)
│   ├── molecules/      # Component combinations
│   │   ├── page-chat/  # Chat interface molecules
│   │   ├── page-data/  # Data management molecules
│   │   ├── page-history/ # History page molecules
│   │   ├── page-setting/ # Settings page molecules
│   │   ├── layout/     # Layout molecules
│   │   ├── dialogs/    # Dialog molecules
│   │   └── *           # Shared molecules
│   ├── organisms/      # Complex components
│   │   ├── page-chat/  # Chat page organisms
│   │   ├── page-data/  # Data management organisms
│   │   ├── page-history/ # History page organisms
│   │   ├── page-setting/ # Settings page organisms
│   │   └── layout/     # Layout organisms
│   ├── common/         # Shared components (MarkdownRenderer, etc.)
│   └── ui/             # shadcn-vue UI components (atoms)
├── composables/        # Vue composables
├── layouts/            # Vue layouts
├── lib/                # Core utilities and database
├── pages/              # Vue pages/routes
├── service-worker/     # PWA service worker
├── stores/             # Pinia stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   └── functions/      # Function calling utilities
└── app.vue             # Root Vue component

tests/                  # Test files
├── components/         # Component tests
├── lib/                # Library tests
├── stores/             # Pinia store tests
├── plugins/            # Plugin tests
└── utils/functions/    # Function utilities tests

public/                 # Static assets
server/                 # Server-side code
```

## Core Features & Architecture

### State Management
**Three-tier data architecture**:
1. **Pinia Stores** (`app/stores/`)
   - `chat.ts` - Current chat session state
   - `gemini.ts` - Gemini API configuration
   - `settings.ts` - Application settings
   - Persistence via `pinia-plugin-persistedstate`

2. **IndexedDB Database** (`app/lib/database.ts`)
   - Chat history persistence
   - Message and file attachment storage
   - Settings backup
   - Uses Dexie.js for type-safe access

3. **Composables** (`app/composables/`)
   - Bridge between stores and components
   - API integrations and business logic

### Key Composables

#### API Integration
- **`useGeminiApi`** - Gemini AI API integration
  - `generateContent()` - Non-streaming generation
  - `generateContentStream()` - Streaming with async generator
  - `validateApiKey()` - API key validation
  - `getAvailableModels()` - Fetch available models

#### Function Calling System
- **`useFunctionCalling`** - TRPG function execution framework
  - Dynamic function registration system
  - Execution context management
  - Function enablement controls
  - Execution logging

#### Data Management
- **`useDatabase`** - IndexedDB operations wrapper
- **`useDataManagement`** - Import/export functionality
- **`useHistoryManagement`** - Chat history operations

#### Feature Composables
- **`useTranslator`** - DeepL/Gemini translation
- **`useProofreader`** - Text proofreading
- **`useFontSettings`** - Font management
- **`useSettings`** - Settings management

### Function Calling Tools (`app/utils/functions/`)
TRPG-specific utilities for game mechanics:
- `rollDice` - Dice rolling mechanics with multiple dice types
- `manageInventory` - Inventory management
- `manageCharacterStatus` - Character stats
- `manageRelationship` - Relationship tracking
- `manageGameDate` - Game timeline
- `manageScene` - Scene management
- `managePersistentMemory` - Memory persistence
- `manageFlags` - Game flags
- `manageStyleProfile` - Style profiles
- `getRandomChoice` - Random selection from arrays
- `getRandomInteger` - Random integer generation
- `generateRandomString` - Random string generation
- `datetime` - Date/time utilities
- `timer` - Timer functionality
- `summarize` - Chat summarization functionality

### Data Flow Patterns

1. **Component → Composable → Store/Database**
   ```
   Component calls composable method
   → Composable updates store/database
   → Store triggers reactivity
   → Component updates via computed properties
   ```

2. **Gemini API Flow**
   ```
   User input → ChatInterface component
   → useGeminiApi.generateContentStream()
   → Stream chunks to UI
   → Save to database via useDatabase
   ```

3. **Function Calling Flow**
   ```
   Gemini requests function → useFunctionCalling.executeFunction()
   → Function handler executes with context
   → Result returned to Gemini
   → Execution logged
   ```

## PWA Configuration

### Service Worker
- Custom service worker at `app/service-worker/sw.ts`
- `injectManifest` strategy for full control
- Workbox for caching strategies
- Auto-reload during development
- Offline support with precaching

### PWA Features
- Install prompt handling in default layout
- Update notifications
- Background sync
- Offline functionality

## Testing

### Framework
- **Vitest** for unit testing
- Test files in `tests/` directory
- `.spec.ts` file extension
- Timezone: `Asia/Tokyo` for consistency

### Test Structure
```
tests/
├── components/        # Component tests
│   ├── MarkdownImage.spec.ts
│   └── MarkdownRenderer.spec.ts
├── lib/               # Library tests
│   ├── history.spec.ts
│   └── markdown.spec.ts
├── stores/            # Pinia store tests
│   ├── settings.spec.ts
│   └── settings-image-percentage.spec.ts
├── plugins/           # Plugin tests
│   └── prism.spec.ts
└── utils/functions/   # Function utilities tests
    ├── rollDice.spec.ts
    ├── manageInventory.spec.ts
    ├── datetime.spec.ts
    ├── timer.spec.ts
    └── [other function tests]
```

### Running Tests
- Run all tests: `bun test`
- Run specific test file: `bun test [filename]` (e.g., `bun test rollDice.spec.ts`)
- Tests run with TZ=Asia/Tokyo timezone for consistency
- Vitest configuration in `vitest.config.ts`

## Code Standards

### Component Patterns
- **Atomic Design** structure (atoms/molecules/organisms)
- **shadcn-vue** as default UI library
- **Single File Components** with `<script setup lang="ts">`
- **v-model** based control flow

### TypeScript
- Strict mode enabled
- Type definitions in `app/types/`
- All composables and stores fully typed
- Service worker excluded from main tsconfig

### Styling
- **TailwindCSS v4** utilities only
- **NO @apply directive** - prepare for v4 removal
- Component-scoped styles avoided
- Utility classes in templates
- Prettier formatting with 200 character line width

### Git Hooks (Lefthook)
Pre-commit hooks run in parallel:
1. TypeScript type checking (`bun typecheck`)
2. ESLint linting (`bun lint`)
3. Unit tests (`TZ=Asia/Tokyo bun test`)

## Icon Management

### Primary: Lucide Icons
- Via shadcn-vue components
- Imported from `lucide-vue-next`
- Used by UI components

### Alternative: Iconify
- Use `@iconify/vue` component
- Material Symbols icon set
- Format: `<Icon icon="material-symbols:name" />`
- Browse: https://icon-sets.iconify.design/material-symbols/

## API Integrations

### Gemini AI (`@google/genai`)
- Content generation (streaming/non-streaming)
- Model management
- System instructions
- Thought process extraction
- Function calling support

### DeepL Translation (Optional)
- Thought process translation
- Requires DeepL API key
- Alternative to Gemini translation

### Font Management
- Google Fonts presets
- System font detection
- Custom font upload
- Real-time preview

## Build & Deployment

### Build Process
- Nuxt 3 with Vite bundler
- PWA manifest injection
- Service worker compilation
- Static site generation support

### Configuration Files
- `nuxt.config.ts` - Nuxt configuration
- `tailwind.config.js` - TailwindCSS setup
- `components.json` - shadcn-vue configuration
- `lefthook.yml` - Git hooks
- `pwa-assets.config.ts` - PWA asset generation

### Environment
- SPA mode (`ssr: false`)
- Development port: 8888
- Preview port: 8880
- Runtime config via `useRuntimeConfig()`

## Quality Gates (MANDATORY)
After code changes, always run:
```bash
bun lint --fix    # Auto-fix linting issues
bun format:fix    # Format code with Prettier
bun typecheck     # Verify TypeScript types
bun test          # Run unit tests
bun run build     # Confirm production build
```

## Component Migration Pattern
When replacing components with shadcn-vue:
1. Rename old component to `ComponentName_old.vue`
2. Implement new component as `ComponentName.vue`
3. Test thoroughly
4. Delete `_old` file after verification

## Local Development Configuration
Read `CLAUDE.local.md` for user-specific configuration and preferences.