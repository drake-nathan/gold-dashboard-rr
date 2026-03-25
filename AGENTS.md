# Dashboard.Gold

A gold/silver price tracking dashboard that monitors Costco precious metals products and compares them with Collect Pure's spot prices and bids.

## Task Management

### System

- **`TASKS.md`** — Priority-ordered index. Sections: Now / Epics / Up Next / Later / Testing. No checkboxes — items are present (pending) or deleted (done). Git history is the archive.
- **`.tasks/<name>.md`** — Lightweight task briefs for medium-complexity work. Use when a one-line `TASKS.md` item needs scope, non-goals, acceptance criteria, or key-file pointers.
- **`.epics/<name>.md`** — Detailed plans for multi-session efforts. Each starts with a status header. Delete when the epic ships.
- **`CLAUDE.md`** — Symlink to `AGENTS.md` for Claude Code compatibility.

### Rules for Agents

1. **Read `TASKS.md` on demand, not by default.**
   - Read it when the user asks what to work on next, asks for priorities/status, or explicitly references the task tracker.
   - Read it before starting work that is clearly coming from a tracked item.
   - Start with the "Now" section, then "Epics", then "Up Next".
2. **Update `TASKS.md` as you work:**
   - Delete items when done. No checkboxes, no ✅ — git history is the archive.
   - Add discovered work to "Up Next" — inform the user when you do.
   - Promote items to "Now" only with user approval.
   - When a `TASKS.md` item with a linked `.tasks/*.md` brief moves into "Now", update that brief's status to `In Progress` in the same change.
   - When a linked task is no longer active, keep the brief status in sync (`Ready`, `In Progress`, or `Blocked`) with the task's actual state.
   - Keep under 80 lines. If a topic grows past 3-4 items, it's an epic.
3. **Epic files** (`.epics/<name>.md`):
   - Create for multi-session work (3+ sessions expected).
   - Always start with: `> **Status:** In Progress | Paused | Blocked`
   - Include: Goal (1 sentence), Plan (current + next steps only), Decisions (table), Notes.
   - Prune completed phases — keep only current and upcoming work.
   - Link from the Epics section in `TASKS.md`.
   - Delete the file when the epic ships.
4. **Task brief files** (`.tasks/<name>.md`):
   - Create for medium-complexity work when a one-line task would be too ambiguous for a cold-start agent.
   - Always start with: `> **Status:** Ready | In Progress | Blocked`
   - Status should reflect tracker reality: `Ready` for queued work, `In Progress` for items in "Now", `Blocked` when the linked task is blocked.
   - Include: Goal, Scope, Non-goals, Acceptance Criteria, Key Files, Notes.
   - Link from `TASKS.md` using `→ [.tasks/<name>.md]`.
   - Delete the file when the task ships or is absorbed into an epic.
5. **Read linked context before starting tracked work:**
   - If a `TASKS.md` item links to `.tasks/*.md`, read that brief before making changes.
   - If a `TASKS.md` item links to `.epics/*.md`, read the epic before making changes.
6. **Blocked items**: Append `(blocked: reason)` to any item that can't progress. Don't delete — the block may clear.
7. **Verify the baseline continuously:** Run `bun run ci` after each completed step or patch so regressions are caught immediately and the branch stays close to green.
8. **No archive directories.** Git history preserves everything.

## Tech Stack

- **Framework**: React Router 7
- **Runtime**: Bun
- **Backend/Database**: Convex
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript 6 + tsgo (native Go compiler, `@typescript/native-preview`)
- **Linting**: OXLint (type-aware) + oxfmt formatter
- **Features**: Server-Side Rendering (SSR), React Compiler (babel-plugin-react-compiler)

## React Best Practices

This project follows React's "You Might Not Need an Effect" guidelines:

- **useEffect**: Only for external system sync (Browser APIs, Convex subscriptions, PostHog). Never for data transforms, user events, expensive calculations (useMemo), state resets (key prop), or chaining Effects.
- **Derived state**: Store minimal IDs, derive full objects with `useMemo`
- **localStorage writes**: Always in event handlers, never in Effects
- **SSR data loading**: Routes use `preloadQuery` (server) + `usePreloadedQuery` (client) from Convex

## File Organization

- **No barrel files**: Avoid `index.ts` re-export files entirely.
- **`index.tsx` is a real entrypoint**: Use it when a folder represents a route or a component module and `index.tsx` contains the actual implementation, not a pass-through export.
- **Co-locate by feature**: Keep route-specific components, hooks, and tests inside that route's folder.
- **Avoid file dumps**: When a route folder starts accumulating many siblings, split into focused subfolders like `filters/`, `calculator/`, `products/`, or `hooks/`.
- **Import rules**: Use relative imports within a feature folder; use `@/` imports only for shared cross-feature modules.

## Environment Setup

See **[docs/environment-variables.md](docs/environment-variables.md)** for the full env var reference.

- **Separate dev/prod environments**: Local dev and Railway Preview use Convex Dev deployment; Railway Prod uses Convex Prod
- Dev data is seeded from production snapshots with `bun run snapshot:sync`; production-only fetch crons stay behind `ENABLE_CRONS=true`
- Clerk and Stripe have separate test/prod API keys
- API keys (Unwrangle, Pure, Gold API, FMP) are shared across environments
- Cron jobs only run in Convex prod (`ENABLE_CRONS=true`)
- Frontend env vars currently fail fast at module scope in `app/root.tsx` and route modules; Convex functions read `process.env` directly. The canonical shared env schema is still tracked separately in `TASKS.md`.

## Scripts

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Production build
bun run ci           # Run format/lint/typecheck/tests with the CI runner
bun run test         # Run unit tests (one-off)
bun run test:watch   # Run tests in watch mode
bun run test:convex  # Run Convex function tests
bun run test:browser # Run browser-mode tests
bun run ts           # Typecheck with tsgo (native Go compiler)
bun run ts:convex    # Typecheck Convex functions with tsgo
bun run lint         # Run OXLint (type-aware)
bun run lint:fix     # Run OXLint with auto-fix
bun run format       # Format with oxfmt
bun run format:check # Check formatting without fixing
```

### CI

`bun run ci` runs `format`, `lint:fix`, `ts`, `ts:convex`, `test`, `test:convex`, and `test:browser` sequentially via `scripts/ci.ts` (Listr fail-fast runner). Use before pushing to main.

## Testing

- **Framework**: Vitest
- **Unit tests**: `.test.ts` / `.test.tsx` — co-located with source files
- **Browser tests**: `.browser.test.tsx` — Vitest Browser Mode with Playwright
- **Convex tests**: `.convex.test.ts` — Convex function tests with `convexTest()` helper
- **Pattern**: Simple `test()` calls (not `describe/it`). Focus on critical paths and edge cases.
- **Coverage target**: 15–20% overall, 70%+ business logic
- See `docs/browser-testing.md` for browser test API details

## Convex

Convex is the backend/database. See `convex/AGENTS.md` for architecture and key files.

**Authentication**: Clerk auth is enabled in production.

**Important**: Dev and prod use separate Convex deployments. Be cautious with schema changes, data mutations, snapshot imports, and cron configuration.

Always read `convex/_generated/ai/guidelines.md` before writing Convex code — it contains rules that override training data assumptions.

## Reference Docs (on-demand, not pre-loaded)

These files contain detailed reference material. Read them when working on the relevant subsystem:

- **`convex/AGENTS.md`** — Convex architecture, safety rules, key files
- **`.claude/docs/market-prices.md`** — Gold API + FMP integration, cron schedules, % change calculation
- **`.claude/docs/docker.md`** — Docker build/run/test commands, Dockerfile details
- **`.claude/docs/posthog.md`** — PostHog analytics setup, SSR config, troubleshooting
- **`.claude/docs/known-issues.md`** — Babel preset, env var flow in SSR, Vite config gotchas
- **`docs/environment-variables.md`** — Complete env var reference with setup checklists

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
