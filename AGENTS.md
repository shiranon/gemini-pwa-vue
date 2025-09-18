# Repository Guidelines

## Project Structure & Module Organization
Core Nuxt source files live in `app/`. Define routes in `app/pages/`, keep UI pieces in PascalCase under `app/components/`, share logic through `app/composables/`, and register Pinia stores in `app/stores/` (e.g., `app/stores/thing.ts` exporting `useThingStore`). Place app-wide helpers in `app/utils/`, PWA config in `app/pwa-assets.config.ts`, and service worker code in `app/service-worker/`. Server middleware and API handlers stay in `server/`, static assets in `public/`, and mirror every significant module with a matching spec in `tests/` (such as `tests/composables/useFeature.spec.ts`).

## Build, Test, and Development Commands
- `bun install` installs dependencies.
- `bun dev` starts Nuxt at http://localhost:8888.
- `bun run build` compiles the production bundle into `.output/`.
- `bun run preview` serves the built bundle at http://localhost:8880.
- `bun run generate` emits a static build when needed.
- `bun run lint` and `bun run typecheck` enforce ESLint 9 + Nuxt type safety.
- `bun test` executes the Vitest suite.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation and `<script setup lang="ts">` in Vue SFCs. Components stay PascalCase (`AppHeader.vue`), composables use `useThing.ts`, stores expose `useThingStore`, and utilities export lowerCamelCase functions. Tailwind CSS v4 classes should stay atomic and descriptive. ESLint and Prettier handle formatting—only disable a rule with strong justification.

## Testing Guidelines
Use Vitest with `@nuxt/test-utils`. Keep specs colocated under `tests/**` with `*.spec.ts` suffixes and mirror the source path. Prioritize coverage for critical composables, stores, and utilities; add UI snapshots only when components are stable. Run `bun test` alongside linting and type checks before submitting changes.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `refactor:`). PRs need a concise summary, linked issues, verification steps, and screenshots for UI work. Update `README.md` or `.env-sample` whenever commands or environment variables change.

## Security & Configuration Tips
Keep secrets in `.env`, expose client-safe values via `NUXT_PUBLIC_*`, and declare them in `runtimeConfig`. Verify PWA assets stay in sync through `app/pwa-assets.config.ts` and audit service worker modifications carefully.

## Agent-Specific Instructions
Keep diffs minimal and targeted. Always run `bun lint --fix`, `bun run typecheck`, and relevant tests before handoff. Prefer additive changes over sweeping refactors and confirm unexpected file changes with the user.
