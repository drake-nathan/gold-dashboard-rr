> **Status:** In Progress

# Convex Auth + Query Hardening

## Goal

Align Convex auth identity usage and remove the highest-risk hot-path query patterns before they become correctness or scaling failures.

## Plan

- Finish the remaining hardening follow-ups that were split out after the auth migration and query decomposition landed.
- Close the epic once alert batching/history indexes, Stripe-path Convex tests, route-level coverage, and query-shape regression coverage are in place.

## Completed

- `userTokenIdentifier` is now the canonical auth key across the main auth-facing Convex paths, with backfills completed in dev and prod on March 22, 2026.
- Migration-era `subject` fallback reads were removed from the main `userCards`, `userSettings`, and `alerts` user-facing paths.
- Dashboard query work was decomposed into narrower helper/query surfaces instead of one broad hot path.
- Admin review work was split into smaller status/count query surfaces.
- Alerts now read from a minimal `alertProductOptions` query surface instead of overfetching product data.

## Remaining

- Add composite indexes for alert batching/history lookup paths.
  Source of truth: `TASKS.md` Up Next
- Add route tests for dashboard filters, alerts flows, and admin access.
  Source of truth: `TASKS.md` Up Next and `.tasks/route-test-coverage.md`
- Add Convex tests for Stripe checkout, portal, and subscription status flows.
  Source of truth: `TASKS.md` Up Next
- Audit unconditional `checkIsAdmin` queries in shared header/mobile navigation.
  Source of truth: `TASKS.md` Up Next and `.tasks/admin-check-callsite-audit.md`
- Add performance regression fixtures for dashboard and admin review query shapes.
  Source of truth: `TASKS.md` Testing

## Exit Criteria

- No remaining auth-linked Convex ownership or lookup paths depend on `identity.subject` as the canonical key.
- Alert batching/history lookups use intentional indexes for their active query shapes.
- Stripe subscription flows have direct Convex test coverage beyond webhook-only coverage.
- Dashboard, alerts, and admin route behaviors affected by this hardening have focused route-level tests.
- Query-shape regression fixtures exist for the dashboard and admin review hot paths.

## Decisions

| Decision                                                            | Status   | Notes                                                                                   |
| ------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Treat auth identity consistency as a correctness issue, not cleanup | Accepted | Current code uses `identity.subject` despite Convex guidance favoring `tokenIdentifier` |
| Keep this as a dedicated high-priority epic                         | Accepted | Work crosses schema assumptions, query design, Stripe linkage, and tests                |
| Prefer targeted hardening over broad rewrites                       | Accepted | Scope is auth keys, hot queries, indexes, and coverage for affected flows               |

## Notes

- Audit evidence spans `convex/_generated/ai/guidelines.md`, `convex/dashboard.ts`, `convex/admin.ts`, `convex/alerts.ts`, `convex/userCards.ts`, `convex/userSettings.ts`, and `convex/stripe.ts`.
- The repo now includes `convex/migrations.ts` plus the `@convex-dev/migrations` component; dev and prod `userTokenIdentifier` backfills completed successfully on March 22, 2026.
- Migration-era `subject` fallback reads have been removed from the auth-facing `userCards`, `userSettings`, and `alerts` paths; alert internals still dual-read raw stored keys where Stripe compatibility requires it.
- Remaining work is tracked in `TASKS.md` under Up Next and Testing; the `Remaining` section above mirrors those items so a fresh agent can start from this file without reconstructing scope from git history or code first.
