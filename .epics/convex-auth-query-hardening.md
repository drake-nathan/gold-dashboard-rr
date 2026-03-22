> **Status:** In Progress

# Convex Auth + Query Hardening

## Goal

Align Convex auth identity usage and remove the highest-risk hot-path query patterns before they become correctness or scaling failures.

## Plan

- Normalize auth-linked lookups onto one canonical identity key across `alerts`, `userCards`, `userSettings`, `admin`, and `stripe`, with a migration-safe rollout.
- Split `dashboard.getStats` and the admin review path into smaller query surfaces, including a minimal product-options query for alerts.
- Add missing indexes and tests for alert batching, Stripe flows, and route-level behaviors tied to these changes.

## Decisions

| Decision                                                            | Status   | Notes                                                                                   |
| ------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Treat auth identity consistency as a correctness issue, not cleanup | Accepted | Current code uses `identity.subject` despite Convex guidance favoring `tokenIdentifier` |
| Keep this as a dedicated high-priority epic                         | Accepted | Work crosses schema assumptions, query design, Stripe linkage, and tests                |
| Prefer targeted hardening over broad rewrites                       | Accepted | Scope is auth keys, hot queries, indexes, and coverage for affected flows               |

## Notes

- Audit evidence spans `convex/_generated/ai/guidelines.md`, `convex/dashboard.ts`, `convex/admin.ts`, `convex/alerts.ts`, `convex/userCards.ts`, `convex/userSettings.ts`, and `convex/stripe.ts`.
- Related follow-up work is tracked in `TASKS.md` under Up Next and Testing so the epic can stay focused on current and next actions.
