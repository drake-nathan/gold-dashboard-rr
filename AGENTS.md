# Dashboard.Gold

A gold/silver price tracking dashboard that monitors Costco precious metals products and compares them with Collect Pure's spot prices and bids.

## Task Management

### System

- **`TASKS.md`** — The task board. All pending work lives here (Active / Short Term / Medium Term / Backlog / Testing). No completed items — delete them when done. Git history is the archive.
- **`.sessions/<name>.md`** — Session files for active epics only. Each starts with a status header. Delete when the epic ships.
- **`CLAUDE.md`** — Symlink to `AGENTS.md` for Claude Code compatibility.

### Rules for Agents

1. **Read `TASKS.md` first** at the start of any task-oriented session to understand current priorities.
2. **Update `TASKS.md` as you work:**
   - Check off / delete items when complete.
   - Add new items you discover in the appropriate section — inform the user when you do.
   - Keep the file under 150 lines. If it grows past that, consolidate or split into an epic.
3. **Session files** (`.sessions/<name>.md`):
   - Create only for multi-session epics (3+ sessions expected).
   - Always start with: `> **Status:** In Progress | Complete | Paused`
   - Link from TASKS.md Active section.
   - Delete when the epic is complete.
4. **No archive directories.** Git history preserves everything.

## Tech Stack

- **Framework**: React Router 7
- **Runtime**: Bun
- **Backend/Database**: Convex
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Linting**: OXLint (type-aware) + oxfmt formatter
- **Features**: Server-Side Rendering (SSR), React Compiler (babel-plugin-react-compiler)

## React Best Practices

This project follows React's "You Might Not Need an Effect" guidelines:

- **useEffect**: Only for external system sync (Browser APIs, Convex subscriptions, PostHog). Never for data transforms, user events, expensive calculations (useMemo), state resets (key prop), or chaining Effects.
- **Derived state**: Store minimal IDs, derive full objects with `useMemo`
- **localStorage writes**: Always in event handlers, never in Effects
- **SSR data loading**: Routes use `preloadQuery` (server) + `usePreloadedQuery` (client) from Convex

## Environment Setup

See **[docs/environment-variables.md](docs/environment-variables.md)** for the full env var reference.

- **Separate dev/prod environments**: Local dev and Railway Preview use Convex Dev deployment; Railway Prod uses Convex Prod
- Clerk and Stripe have separate test/prod API keys
- API keys (Unwrangle, Pure, Gold API, FMP) are shared across environments
- Cron jobs only run in Convex prod (`ENABLE_CRONS=true`)
- Environment variables validated with `@t3-oss/env-core`: client vars in `app/env.client.ts`, server vars in `app/env.server.ts`

## Scripts

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Production build
bun run ci           # Run all checks (format, lint, typecheck) in parallel
bun run test         # Run unit tests (one-off)
bun run test:watch   # Run tests in watch mode
bun run test:convex  # Run Convex function tests
bun run test:browser # Run browser-mode tests
bun run typecheck    # Run TypeScript checks
bun run lint         # Run OXLint (type-aware)
bun run lint:fix     # Run OXLint with auto-fix
bun run format       # Format with oxfmt
bun run format:check # Check formatting without fixing
```

### CI

`bun run ci` runs all checks via Turbo for parallel execution: `format`, `lint:fix`, `typecheck`, `typecheck:convex`, `test`, `test:convex`, `test:browser`. Use before pushing to main.

## Testing

- **Framework**: Vitest
- **Unit tests**: `.test.ts` / `.test.tsx` — co-located with source files
- **Browser tests**: `.browser.test.tsx` — Vitest Browser Mode with Playwright
- **Convex tests**: `.convex.test.ts` — Convex function tests with `convexTest()` helper
- **Pattern**: Simple `test()` calls (not `describe/it`). Focus on critical paths and edge cases.
- See `docs/browser-testing.md` for browser test API details

## Convex

Convex is the backend/database. See `convex/AGENTS.md` for architecture and key files.

**Authentication**: Clerk auth is enabled in production.

**Important**: Dev and prod share the same Convex deployment — be cautious with schema changes, data mutations, and cron jobs.

Always read `convex/_generated/ai/guidelines.md` before writing Convex code — it contains rules that override training data assumptions.

## Reference Docs (on-demand, not pre-loaded)

These files contain detailed reference material. Read them when working on the relevant subsystem:

- **`convex/AGENTS.md`** — Convex architecture, safety rules, key files
- **`.claude/docs/market-prices.md`** — Gold API + FMP integration, cron schedules, % change calculation
- **`.claude/docs/docker.md`** — Docker build/run/test commands, Dockerfile details
- **`.claude/docs/posthog.md`** — PostHog analytics setup, SSR config, troubleshooting
- **`.claude/docs/known-issues.md`** — Babel preset, env var flow in SSR, Vite config gotchas
- **`docs/environment-variables.md`** — Complete env var reference with setup checklists
