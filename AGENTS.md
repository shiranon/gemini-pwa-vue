# Repository Guidelines

## Project Structure & Module Organization
Source lives in `app/`, with `pages/` for routes, PascalCase Vue components in `components/`, shared logic in `composables/` and store modules under `stores/`. Utilities sit in `app/utils/`, PWA assets and service worker code live in `app/pwa-assets.config.ts` and `app/service-worker/`. Server middleware and API endpoints reside in `server/`. Static assets go in `public/`. Place automated tests under `tests/` mirroring source paths (e.g., `tests/composables/useFeature.spec.ts`).

## Build, Test, and Development Commands
- `bun install` — install dependencies.
- `bun dev` — launch Nuxt locally on http://localhost:8888.
- `bun run build` — produce the production bundle in `.output/`.
- `bun run preview` — serve the built app at http://localhost:8880.
- `bun run generate` — emit a static build when needed.
- `bun run lint` / `bun run typecheck` — run ESLint 9 and Nuxt type checks; fix issues before committing.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation. Vue SFCs use `<script setup lang="ts">`. Keep components PascalCase (`AppHeader.vue`), composables `useThing.ts`, and Pinia stores `useThingStore` in `app/stores/thing.ts`. Utilities export lowerCamelCase functions. Tailwind CSS v4 classes should stay atomic and descriptive. Formatting is enforced by ESLint + Prettier; do not disable rules without strong justification.

## Testing Guidelines
Adopt Vitest with `@nuxt/test-utils`. Write specs beside mirrors of source paths in `tests/**`, using `*.spec.ts` names. Focus on critical composables, stores, and lib utilities; add snapshots only for stable UI. Run tests locally with `bun test` (or project-specific script if added) and ensure lint/typecheck pass.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `refactor:`) as seen in history. PRs must describe purpose, key changes, testing steps, and include screenshots for UI updates plus linked issues. Update `README.md` or `.env-sample` whenever commands or environment variables change.

## Security & Configuration Tips
Secrets belong in `.env`; expose client-safe values only via `NUXT_PUBLIC_*` and declare them in `runtimeConfig`. Keep PWA assets in sync through `app/pwa-assets.config.ts` and review service worker changes carefully.

## Agent-Specific Instructions
Keep diffs minimal and scoped. Run `bun lint --fix` and `bun run typecheck` before handing off work. Avoid refactors unrelated to the task and prefer additive changes over rewrites.
