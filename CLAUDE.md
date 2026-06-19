# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A Nuxt 3 Progressive Web App for AI chat interactions, specifically designed for TRPG (tabletop role-playing game) scenarios. This is a complete Vue.js rewrite of the original [Gemini PWA Client Mk-II](https://github.com/kinkan04/Gemini-PWA-Mk-II), featuring modern TypeScript architecture and enhanced PWA capabilities.

Supports **Gemini AI**, **OpenAI**, and **Claude** APIs with streaming, function calling, and thought process extraction.

**Live Demo**: [gemini-pwa-vue.vercel.app](https://gemini-pwa-vue.vercel.app)

### Key Features
- **Multi AI Provider Support** - Gemini AI, OpenAI, and Claude with unified interface
- **TRPG Function Calling** - 15+ game mechanics tools (dice, inventory, status, etc.)
- **Character Image System** - Inline character images with outfit/expression management
- **Background Image System** - Dynamic background images with AI-controlled scene management
- **Settings Profiles** - Multiple configuration profiles with quick switching
- **Thought Process Translation** - DeepL/Gemini translation for AI thinking
- **Chat Summarization** - Reduce token usage by summarizing chat history
- **PWA Support** - Offline functionality with service worker caching
- **IndexedDB Storage** - Persistent chat history and character data

## Development Commands

### Essential Commands
- `bun install` - Install dependencies
- `bun run dev` - Start development server on http://localhost:8888
- `bun run build` - Build for production
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Run ESLint (auto-fixes with Prettier formatting)
- `bun run test` - Run all tests via the isolated runner (`scripts/run-tests.ts`), each spec file in its own process with TZ=Asia/Tokyo
- `bun test [file]` - Run specific test file (e.g., `bun test rollDice.spec.ts`)
  - NOTE: Do not run a bare `bun test` (whole suite in one process). `mock.module` leaks across files in bun and breaks unrelated suites. Use `bun run test` (isolated) or `bun test <file>` (single file).
- `bun run check-all` - Run lint, typecheck, and test in sequence
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
├── constants/          # Application constants
├── function-calling/   # Function calling system
│   └── functions/      # TRPG function implementations
├── layouts/            # Vue layouts
├── lib/                # Core utilities and database
├── pages/              # Vue pages/routes
├── service-worker/     # PWA service worker
├── stores/             # Pinia stores
├── types/              # TypeScript type definitions
└── app.vue             # Root Vue component

tests/                  # Test files
├── components/         # Component tests
├── composables/        # Composables tests
├── function-calling/   # Function calling tests
├── lib/                # Library tests
├── stores/             # Pinia store tests
└── plugins/            # Plugin tests

public/                 # Static assets
server/                 # Server-side code
```

## Core Features & Architecture

### State Management
**Three-tier data architecture**:
1. **Pinia Stores** (`app/stores/`)
   - `chat.ts` - Current chat session state
   - `gemini.ts` - Gemini API configuration and operations
   - `openai.ts` - OpenAI API configuration and operations
   - `settings.ts` - Global application settings
   - `settingsProfiles.ts` - Settings profiles management
   - Persistence via `pinia-plugin-persistedstate`

2. **IndexedDB Database** (`app/lib/database.ts`)
   - Chat history persistence
   - Message and file attachment storage
   - Character image data (characters, outfits, images)
   - Background image management
   - Settings and profiles backup
   - Uses Dexie.js for type-safe access
   - See [Database Schema](#database-schema) for detailed table structure

3. **Composables** (`app/composables/`)
   - Bridge between stores and components
   - API integrations and business logic

### Key Composables

#### API Integration
- **`useGeminiApi`** - Gemini AI API integration
  - `generateContent()` - Non-streaming generation
  - `generateContentStream()` - Streaming with async generator
  - `getAvailableModels()` - Fetch available models
- **`useOpenAiAgentsApi`** - OpenAI Agents API integration
  - Streaming support
  - Function calling integration
  - Thread management

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

#### Character Image System
- **`useCharacterImages`** - Character image management
  - Character, outfit, and image CRUD operations
  - Image search and filtering
- **`useImageUpload`** - Image upload handling
- **`useImageOptimization`** - Image compression and optimization
- **`useImageExport`** - Export character images to ZIP
- **`useFolderUpload`** - Batch folder upload support

#### Feature Composables
- **`useTranslator`** - DeepL/Gemini translation
- **`useProofreader`** - Text proofreading
- **`fontSettings`** - Font management
- **`useSettings`** - Global settings management
- **`useProfileSettings`** - Settings profile operations
- **`useQuickActions`** - Quick settings modal actions
- **`useStorageQuota`** - Storage quota monitoring
- **`useSummary`** - Chat summarization
- **`useNavigation`** - Page navigation helpers
- **`useMobileMenu`** - Mobile menu state
- **`useClickOutside`** - Click outside detection

### Function Calling Tools (`app/function-calling/functions/`)
TRPG-specific utilities for game mechanics that can be called by AI:
- `rollDice` - Dice rolling mechanics with multiple dice types (d4, d6, d8, d10, d12, d20, d100)
- `manageInventory` - Inventory management (add, remove, update items)
- `manageCharacterStatus` - Character stats (HP, MP, status effects)
- `manageRelationship` - Relationship tracking between characters
- `manageGameDate` - Game timeline management
- `manageScene` - Scene management (location, time, weather)
- `manageBackground` - Dynamic background image control based on scene/atmosphere
- `managePersistentMemory` - Memory persistence across sessions
- `manageFlags` - Game flags and triggers
- `manageStyleProfile` - Writing style profiles
- `getRandomChoice` - Random selection from arrays
- `getRandomInteger` - Random integer generation
- `generateRandomString` - Random string generation
- `datetime` - Date/time utilities
- `timer` - Timer functionality (countdown, stopwatch)

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

### Character Image System
A comprehensive system for managing character images in TRPG scenarios:

**Database Structure**:
- `characters` table - Character metadata (name, description)
- `characterOutfits` table - Outfit variations per character
- `characterImages` table - Individual images (expression/scene)

**Markdown Integration**:
- Syntax: `![C-](:character/CharacterName/OutfitName/ExpressionName "image")`
- Images render inline in chat messages
- Supports dynamic image loading

**Management Features**:
- Folder batch upload (character → outfits → images)
- Individual image upload with compression
- Export to ZIP with structured folders
- Search and filtering capabilities
- Storage quota monitoring

### Background Image System
Dynamic background image management for TRPG scene atmosphere:

**Database Structure**:
- `backgroundImages` table - Background image metadata with base64-encoded image data
- `backgroundCategories` table - Category organization for background images

**Function Calling Integration**:
- `manageBackground` function for AI-controlled background changes
- Automatic scene-based background selection
- Supports atmosphere and mood-based switching

**Management Features**:
- Pre-register background images in the data management page
- AI can dynamically change backgrounds during chat
- Seamless integration with scene management
- Storage quota monitoring

### Settings Profile System
Multi-profile configuration management:

**Profile Features**:
- Multiple settings profiles with independent configurations
- Profile-specific settings (model, temperature, system prompt, etc.)
- Global settings shared across profiles
- Default profile designation
- Quick settings modal for temporary overrides

**Settings Partitioning**:
- `extractProfileSettings()` - Extract profile-specific settings
- `extractGlobalSettings()` - Extract global settings
- `mergeSettingsFromSlices()` - Merge profile and global settings
- Supports temporary settings overlay

## Database Schema

### IndexedDB Structure (`app/lib/database.ts`)
Database: `GeminiPWADatabase` (using Dexie.js)

**Core Tables**:

1. **chats** - Chat session management
   - Primary Key: `id`
   - Indexes: `title`, `createdAt`, `updatedAt`, `isArchived`, `isFavorite`, `[isArchived+updatedAt]`, `messageCount`
   - Related: `messages`, `attachedFiles`

2. **messages** - Chat messages
   - Primary Key: `id`
   - Indexes: `chatId`, `role`, `createdAt`, `updatedAt`, `[chatId+order]`, `order`
   - Foreign Key: `chatId` → `chats.id`
   - Related: `attachedFiles`
   - Supports: `isSummary` flag for summarized messages

3. **attachedFiles** - File attachments
   - Primary Key: `id`
   - Indexes: `messageId`, `chatId`, `type`, `createdAt`, `size`
   - Foreign Keys: `messageId` → `messages.id`, `chatId` → `chats.id`
   - Stores: Base64-encoded file data

**Settings Tables**:

4. **settings** - Global application settings
   - Primary Key: `id`
   - Indexes: `updatedAt`, `version`
   - Single record with ID: `default`

5. **settingsProfiles** - Settings profiles
   - Primary Key: `id`
   - Indexes: `name`, `createdAt`, `updatedAt`, `isDefault`
   - Contains: Profile-specific settings (model, temperature, etc.)

6. **appMeta** - Application metadata
   - Primary Key: `key`
   - Indexes: `updatedAt`
   - Stores: System defaults, profile metadata

**Character Image Tables**:

7. **characters** - Character definitions
   - Primary Key: `id`
   - Indexes: `name`, `description`, `createdAt`, `updatedAt`
   - Related: `characterOutfits`, `characterImages`

8. **characterOutfits** - Character outfit variations
   - Primary Key: `id`
   - Indexes: `characterId`, `name`, `description`, `createdAt`, `updatedAt`, `[characterId+name]`
   - Foreign Key: `characterId` → `characters.id`
   - Related: `characterImages`

9. **characterImages** - Character expression images
   - Primary Key: `id`
   - Indexes: `characterId`, `outfitId`, `expression`, `mimeType`, `createdAt`, `updatedAt`, `[characterId+outfitId]`, `[characterId+outfitId+expression]`
   - Foreign Keys: `characterId` → `characters.id`, `outfitId` → `characterOutfits.id`
   - Stores: Base64-encoded image data

**Background Image Tables**:

10. **backgroundCategories** - Background image categories
    - Primary Key: `id`
    - Indexes: `name`, `createdAt`, `updatedAt`
    - Related: `backgroundImages`

11. **backgroundImages** - Background images
    - Primary Key: `id`
    - Indexes: `categoryId`, `name`, `mimeType`, `size`, `createdAt`, `updatedAt`, `[categoryId+name]`
    - Foreign Key: `categoryId` → `backgroundCategories.id`
    - Stores: Base64-encoded image data

### Database Versioning
- **v1**: Initial schema (chats, messages, attachedFiles, settings, appMeta)
- **v2**: Reserved for future use
- **v3**: Added `settingsProfiles` table
- **v4**: Added `isSummary` flag to messages
- **v5**: Added character image tables (characters, characterOutfits, characterImages)
- **v6**: Added background image tables (backgroundCategories, backgroundImages)

### Change Notification System
Database implements a change listener system that notifies components of:
- Create operations
- Update operations
- Delete operations

Components can subscribe to changes via `db.onChange()` and unsubscribe via `db.offChange()`.

### Type Definitions
All database record types are defined in `app/types/database.ts`:
- `ChatRecord`, `MessageRecord`, `AttachedFileRecord`
- `SettingsRecord`, `SettingsProfileRecord`, `AppMetaRecord`
- `CharacterRecord`, `CharacterOutfitRecord`, `CharacterImageRecord`
- `BackgroundCategoryRecord`, `BackgroundImageRecord`
- Helper types: `DatabaseOperationResult<T>`, `ExportedData`, `ImportResult`, `DatabaseStats`

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
├── composables/       # Composables tests
├── function-calling/  # Function calling tests
│   ├── rollDice.spec.ts
│   ├── manageInventory.spec.ts
│   ├── datetime.spec.ts
│   ├── timer.spec.ts
│   └── [other function tests]
├── lib/               # Library tests
│   ├── history.spec.ts
│   └── markdown.spec.ts
├── stores/            # Pinia store tests
│   ├── settings.spec.ts
│   └── settings-image-percentage.spec.ts
└── plugins/           # Plugin tests
    └── prism.spec.ts
```

### Running Tests
- Run all tests: `bun run test` (isolated runner — one process per spec file; avoids `mock.module` cross-file leakage)
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
- **NO barrel exports** (index.ts files) - Import directly from specific files

### Styling
- **TailwindCSS v4** utilities only
- **NO @apply directive** - prepare for v4 removal
- Component-scoped styles avoided
- Utility classes in templates
- Prettier formatting with Tailwind CSS plugin

### Git Hooks (Lefthook)
Pre-commit hooks run in parallel on `*.{vue,ts}` files:
1. ESLint linting (`bun lint`)
2. TypeScript type checking (`bun typecheck`)
3. Unit tests (`TZ=Asia/Tokyo bun test`)

All three checks must pass before commits are allowed.

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
- Model management with dynamic fetching
- System instructions
- Thought process extraction (`thinkingConfig`)
- Function calling support
- Google Search grounding tool

### OpenAI (`@openai/agents`)
- Agents API integration
- Streaming support
- Thread-based conversations
- Function calling integration
- Compatible with assistant configurations

### Claude (`@anthropic-ai/sdk`)
- Claude API integration
- Streaming support
- Function calling support
- Compatible with TRPG function calling tools
- Extended thinking support

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
bun lint          # Auto-fix linting issues (includes Prettier formatting)
bun typecheck     # Verify TypeScript types
bun run build     # Confirm production build
```

**IMPORTANT: DO NOT run `bun test` during normal development. Tests should only be run manually by the user when needed.**

Note: Pre-commit hooks (via Lefthook) automatically run `bun lint`, `bun typecheck`, and `bun run test` (isolated runner) in parallel on staged files.

## Component Migration Pattern
When replacing components with shadcn-vue:
1. Rename old component to `ComponentName_old.vue`
2. Implement new component as `ComponentName.vue`
3. Test thoroughly
4. Delete `_old` file after verification

## Local Development Configuration
Read `CLAUDE.local.md` for user-specific configuration and preferences.