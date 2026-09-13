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

### Package Manager
**Bun** is the required package manager. Always use `bun` commands instead of npm/yarn/pnpm.

### Testing gotcha
- Do not run a bare `bun test` (whole suite in one process) — `mock.module` leaks across files in bun and breaks unrelated suites.
- Use `bun run test` (isolated runner, `scripts/run-tests.ts`, one process per spec file, TZ=Asia/Tokyo) or `bun test <file>` (single file) instead.

## Conventions & Gotchas

### Character Image Markdown Syntax
- Syntax: `![C-](:character/CharacterName/OutfitName/ExpressionName "image")`
- Images render inline in chat messages with dynamic loading

### Component Patterns
- **Atomic Design** structure (atoms/molecules/organisms)
- **shadcn-vue** as default UI library
- **Single File Components** with `<script setup lang="ts">`
- **v-model** based control flow

### TypeScript
- Service worker excluded from main tsconfig
- **NO barrel exports** (index.ts files) - Import directly from specific files

### Styling
- **TailwindCSS v4** utilities only
- **NO @apply directive** - prepare for v4 removal
- Component-scoped styles avoided
- Utility classes in templates
- Prettier formatting with Tailwind CSS plugin

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

## Quality Gates (MANDATORY)
After code changes, always run:
```bash
bun lint          # Auto-fix linting issues (includes Prettier formatting)
bun typecheck     # Verify TypeScript types
bun run build     # Confirm production build
```

**IMPORTANT: DO NOT run `bun test` during normal development. Tests should only be run manually by the user when needed.**

Note: Pre-commit hooks (via Lefthook) automatically run `bun lint`, `bun typecheck`, and `bun test` in parallel on staged files.

## Component Migration Pattern
When replacing components with shadcn-vue:
1. Rename old component to `ComponentName_old.vue`
2. Implement new component as `ComponentName.vue`
3. Test thoroughly
4. Delete `_old` file after verification

## Local Development Configuration
Read `CLAUDE.local.md` for user-specific configuration and preferences.
