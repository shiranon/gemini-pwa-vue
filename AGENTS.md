# Repository Guidelines

## Project Structure & Module Organization
Nuxt 3 application code lives in `app/`. Define routes in `app/pages/`, keep reusable UI in PascalCase components under `app/components/`, and colocate domain logic in `app/composables/` and `app/stores/` (for example, `app/stores/session.ts` exporting `useSessionStore`). Shared helpers belong in `app/utils/`, service worker code in `app/service-worker/`, and PWA tuning in `app/pwa-assets.config.ts`. API endpoints and middleware reside in `server/`, while public assets sit in `public/`. Mirror every significant feature with specs under `tests/**`, following the same directory structure for fast discovery.

## Build, Test, and Development Commands
`bun install` locks dependencies before the first run. Use `bun dev` to launch the local server on http://localhost:8888 with hot reload. Package production builds with `bun run build` and inspect them via `bun run preview`. Generate a static bundle for hosting by running `bun run generate`. Quality gates rely on `bun run lint`, `bun run typecheck`, and the Bun-native test command `bun test`; `bun run check-all` chains linting, types, and tests for a complete sweep.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation. Vue SFCs should adopt `<script setup lang="ts">` and keep script blocks lean. Components follow PascalCase (`AppShell.vue`), composables use the `useThing.ts` pattern, Pinia stores expose `useThingStore`, and utility helpers ship lower camel case exports. Tailwind CSS v4 classes stay atomic, descriptive, and ordered by layout → typography → state. Respect ESLint 9 and Prettier defaults; only disable rules with an inline justification.

## Testing Guidelines
Tests run on Bun’s built-in `bun:test` runner; do not introduce Vitest. Store fixtures and helpers beside specs in `tests/`, and reuse the shared setup in `tests/setup.ts` when mocking browser APIs. Target critical composables, stores, and rendering logic, and add snapshots once component contracts settle. Execute `bun test` (optionally with `--watch`) before submitting changes and include results in handoff notes.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) with concise, action-oriented subjects. Document scope, linked issues, and verification evidence inside the message body. Pull requests need a summary, test checklist, and UI screenshots or clips for visual updates. Update `README.md`, `docs/`, or configuration samples whenever commands, environment variables, or operational steps change.

## Security & Configuration Tips
Keep secrets in `.env`; expose browser-safe values through `NUXT_PUBLIC_*` and surface them via `runtimeConfig`. When touching service workers or PWA assets, update `app/pwa-assets.config.ts` and validate caching strategy changes. Review any new dependencies added to `bun.lock`, note the reason in the PR, and scan licenses when integrating third-party code.

## Agent-Specific Instructions
Limit diffs to the requested scope, avoid reformatting untouched files, and favor additive edits. Always run `bun run lint --fix` and `bun run typecheck` before handoff. Skip executing `bun test` unless the user explicitly requests it, but remind human contributors to run the suite locally. Never stage or commit on behalf of the user, and pause to confirm if unexpected file changes appear.
