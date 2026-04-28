> **Status:** In Progress
> **Started:** 2024-12-27

# Alerts & Subscriptions

## Goal

Finish the alerts/subscriptions feature to production quality by tightening the route structure, closing the main UI polish gaps, and adding the missing route-level confidence for the user flows that already exist.

## Plan

- Ship the alerts UI to prod behind a PostHog `alerts-beta` flag so admins can verify Stripe + Resend end-to-end before public exposure.
- Once the closed beta validates the prod path, close the remaining UI polish and coverage gaps and roll the flag out.

## Completed

- Phase 0-3 work shipped previously; the core alerts/subscriptions stack is already in the repo.
- Phase 4 core shipped: alert CRUD, evaluation engine, batched email digests, and the main `/alerts` route/UI.
- Convex-side coverage is already substantial for alerts evaluation, batching, unsubscribe behavior, and subscription-state interactions.
- Hook/component coverage exists for subscription state, upgrade flow, and portal flow, so the main confidence gap is route-level behavior rather than basic primitives.
- `app/routes/alerts.tsx` is now reduced to a route export surface, with page orchestration, form state, dialog UI, and card rendering split into smaller modules under `app/routes/alerts/*`.
- PostHog feature-flag infrastructure added (`app/lib/feature-flags.ts`, `app/lib/feature-flags.server.ts`, `app/providers/feature-flag-provider.tsx`) with SSR bootstrap wired through the root loader and PostHog provider options. `useFeatureFlag(key)` reads from a context populated by the loader so values are stable through the initial render.
- Alerts and paid-feature surface gated on the `alerts-beta` PostHog flag: header link, mobile menu, `/alerts` route loader (redirects non-flagged users to `/`), Upgrade button, and the in-stock alert CTA on product cards. `VITE_STRIPE_ENABLED` is no longer mixed into per-user UI gating — it stays as a build-level switch for whether Stripe is wired up at all in a given environment. Browser tests cover both flag-on and flag-off paths; a unit test covers the loader redirect.
- PostHog identify enriched with `email` (Clerk), `is_pro`/`subscription_status` (subscription hook), and `is_admin` (new `useIsAdmin` hook backed by `api.admin.checkIsAdmin`). The `alerts-beta` flag now targets `is_admin: true` as the primary condition, with the original distinct ID list kept as a transitional fallback until the property propagates.

## Remaining

- Confirm prod env vars before flipping the flag on (Stripe secrets/price IDs, Resend keys, `ENABLE_CRONS=true`, `ADMIN_USER_IDS` includes admin Clerk IDs). Smoke-test in prod end-to-end as an admin: create alert → trigger threshold → verify digest email.
- Add focused route/browser tests for dashboard filters, alerts flows, and admin access, with alerts called out explicitly.
  Source of truth: `TASKS.md` Up Next and `.tasks/route-test-coverage.md`
- Polish the `/alerts` experience around empty/loading/error states and responsive behavior.
  Source of truth: this epic and `TASKS.md` Now
- Refactor alerts from a standalone page to a drawer on the dashboard (list + create/edit dialogs stay as-is, nav opens drawer instead of navigating).
  Source of truth: `TASKS.md` Up Next
- Decide whether shared public chrome should move into a layout route for dashboard and alerts.
  Source of truth: `TASKS.md` Up Next and `.tasks/public-layout-route.md`
- Test alerts and subscription flows on real mobile devices.
  Source of truth: `TASKS.md` Up Next
- Add fallback and observability follow-ups that materially affect alerts UX and supportability.
  Source of truth: `TASKS.md` Up Next (`Fallback UI when market prices fail`, `Structured logs for alerts, checkout, and auth flows`)
- Public rollout: ramp `alerts-beta` to all signed-in users in PostHog once the polish items above land.

## Exit Criteria

- `/alerts` has focused browser coverage for signed-out gating and at least one signed-in happy path.
- The alerts/subscription UI handles loading, empty, and error states intentionally on desktop and mobile.
- Shared chrome decisions for dashboard/alerts are settled enough that alerts UI ownership is clear.
- Remaining supportability gaps that directly affect alerts flows are either shipped or explicitly moved out of this epic.

## Decisions

| Decision               | Choice                                          | Rationale                                                                                                                        |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Notifications**      | Email only (via Resend)                         | SMS still adds operational and compliance overhead; defer it.                                                                    |
| **Alert Timing**       | Batched digests                                 | Reduces spam and keeps stock/price triggers readable.                                                                            |
| **Payments**           | Stripe Checkout + Webhooks + Customer Portal    | Existing implementation path is already in place and matches the product.                                                        |
| **Beta Gating**        | PostHog feature flag (`alerts-beta`)            | Per-user targeting without redeploys, no env var sprawl. Establishes the long-term flag pattern for future closed betas.         |
| **Authorization**      | Existing Convex entitlements + `requireAdmin`   | Flags control UI exposure, not authorization. Server-side gates remain the security control even with the flag fully rolled out. |
| **Current Epic Scope** | Closed beta in prod, then polish, then roll out | Core behavior exists; gating it lets us de-risk Stripe + Resend in prod while polish work continues in parallel.                 |

## Notes

- The old launch-phase checklist has been intentionally pruned; git history is the archive.
- Current active work is centered on `app/routes/alerts.tsx`, route-level test coverage, and polish around the existing alerts/subscription experience.
- Keep route structure work separate from Convex auth/query hardening unless a dependency forces them together.
