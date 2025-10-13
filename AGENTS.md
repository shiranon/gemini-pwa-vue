# Repository Guidelines

## Project Structure & Module Organization
Core Nuxt code lives in `app/`. Define routes in `app/pages/`, keep shared UI in PascalCase components under `app/components/`, and colocate business logic in `app/composables/` and `app/stores/` (e.g., `app/stores/thing.ts` exporting `useThingStore`). App-wide helpers belong in `app/utils/`, PWA tuning in `app/pwa-assets.config.ts`, and service worker code under `app/service-worker/`. Server middleware and API endpoints reside in `server/`, while static assets go in `public/`. Mirror each significant module with a partner spec under `tests/` (for example, `tests/composables/useFeature.spec.ts`).

## Build, Test, and Development Commands
Run `bun install` once to lock dependencies. Use `bun dev` to launch Nuxt at http://localhost:8888. `bun run build` outputs the production bundle to `.output/`; preview it with `bun run preview`. Generate a static bundle through `bun run generate`. Enforce quality gates with `bun run lint`, `bun run typecheck`, and execute the Vitest suite via `bun test` before handoff (you may skip `bun test` during active development iterations).

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation. Vue SFCs should use `<script setup lang="ts">`. Components follow PascalCase (`AppHeader.vue`), composables use `useThing.ts`, Pinia stores expose `useThingStore`, and utilities export lowerCamelCase helpers. Tailwind CSS v4 classes stay atomic and descriptive. Respect ESLint 9 and Prettier defaults; disable rules only with explicit justification.

## Testing Guidelines
Use Vitest with `@nuxt/test-utils`. Keep specs under `tests/**` with matching names, e.g., `tests/components/AppHeader.spec.ts`. Cover critical composables, stores, and utilities; add component snapshots once stabilized. Run `bun test` locally, and pair it with linting and type checks before submitting changes.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (`feat:`, `fix:`, `refactor:`). Titles should describe intent; body text links issues and outlines scope. Pull requests need a concise summary, verification steps, and screenshots for UI updates. Update `README.md` or `.env-sample` whenever commands, configuration, or environment variables change.

## Security & Configuration Tips
Keep secrets in `.env` and expose client-safe values through `NUXT_PUBLIC_*`, mirroring them in `runtimeConfig`. When touching the service worker or PWA assets, update `app/pwa-assets.config.ts` alongside any bundle changes and review caching impacts.

## Agent-Specific Instructions
Keep diffs minimal, favor additive updates, and leave unrelated user changes untouched. Always run `bun run lint --fix`, `bun run typecheck`, and relevant tests before handoff; `bun test` can be deferred until handoff if it slows down development loops. Stop and confirm with the user if unexpected modifications appear outside your changes.

**IMPORTANT: DO NOT COMMIT CHANGES AUTOMATICALLY**
- Never run `git commit` or `git add` commands without explicit user permission
- Only make file changes, never commit them
- Let the user handle all git operations including staging and committing
- If changes are made, inform the user that they need to commit manually
