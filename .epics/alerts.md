> **Status:** In Progress
> **Started:** 2024-12-27

# Alerts

## Goal

Keep the `/alerts` feature healthy as a free, supported part of the dashboard. Paid-subscription monetization was **shelved 2026-06-13** (0 conversions in 3 weeks post-launch; pivoted to cutting infra cost + a donation button — see [.tasks/replace-unwrangle.md] and git history). Remaining work here is targeted polish and coverage, not a paid rollout.

## Plan

- Close the remaining UI polish gaps (error states, mobile) and any high-value coverage gaps.
- Decide alerts gating now that monetization is off the table: ungate to all signed-in users, or leave the `paid-features` flag dormant.

## Completed

- Phase 0-3 work shipped previously; the core alerts/subscriptions stack is already in the repo.
- Phase 4 core shipped: alert CRUD, evaluation engine, batched email digests, and the main `/alerts` route/UI.
- Convex-side coverage is already substantial for alerts evaluation, batching, unsubscribe behavior, and subscription-state interactions.
- Hook/component coverage exists for subscription state, upgrade flow, and portal flow, so the main confidence gap is route-level behavior rather than basic primitives.
- `app/routes/alerts.tsx` is now reduced to a route export surface, with page orchestration, form state, dialog UI, and card rendering split into smaller modules under `app/routes/alerts/*`.
- PostHog feature-flag infrastructure added (`app/lib/feature-flags.ts`, `app/lib/feature-flags.server.ts`, `app/providers/feature-flag-provider.tsx`) with SSR bootstrap wired through the root loader and PostHog provider options. `useFeatureFlag(key)` reads from a context populated by the loader so values are stable through the initial render.
- Alerts and paid-feature surface gated on the `paid-features` PostHog flag: header link, mobile menu, `/alerts` route loader (redirects non-flagged users to `/`), Upgrade button, and the in-stock alert CTA on product cards. `VITE_STRIPE_ENABLED` is no longer mixed into per-user UI gating — it stays as a build-level switch for whether Stripe is wired up at all in a given environment. Browser tests cover both flag-on and flag-off paths; a unit test covers the loader redirect.
- PostHog identify enriched with `email` (Clerk), `is_pro`/`subscription_status` (subscription hook), and `is_admin` (new `useIsAdmin` hook backed by `api.admin.checkIsAdmin`). The `paid-features` flag now targets `is_admin: true` as the primary condition, with the original distinct ID list kept as a transitional fallback until the property propagates.

## Remaining

- Polish the `/alerts` experience around error states and responsive behavior (empty + loading states already covered).
  Source of truth: this epic and `TASKS.md` Now
- Add focused route/browser tests for the highest-value alerts flows still uncovered (digest preferences, edit/delete, upgrade gating).
  Source of truth: `TASKS.md` Up Next
- Test alerts and subscription flows on real mobile devices.
  Source of truth: `TASKS.md` Up Next
- Add observability follow-ups that materially affect alerts UX and supportability.
  Source of truth: `TASKS.md` Up Next (`Fallback UI when market prices fail`, `Structured logs for alerts, checkout, and auth flows`)
- Decide alerts gating now that paid subs are shelved: ungate to all signed-in users, or leave the `paid-features` flag dormant.

### Dropped from scope

- Drawer refactor — owner prefers the standalone `/alerts` page; local stash exists if this is ever revisited.
- Shared public chrome / layout route decision — not blocking launch; revisit independently.
- Pre-launch prod env-var checklist and admin smoke-test — owner has been running a paid subscription against the prod flow for several weeks (2026-05-20).

## Exit Criteria

- `/alerts` has focused browser coverage for signed-out gating, signed-in happy path, empty state, and loading state.
- The alerts/subscription UI handles loading, empty, and error states intentionally on desktop and mobile.
- Alerts gating decision made (ungate vs. dormant flag) and reflected in the UI.
- Remaining supportability gaps that directly affect alerts flows are either shipped or explicitly moved out of this epic.

## Decisions

| Decision               | Choice                                          | Rationale                                                                                                                        |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Notifications**      | Email only (via Resend)                         | SMS still adds operational and compliance overhead; defer it.                                                                    |
| **Alert Timing**       | Batched digests                                 | Reduces spam and keeps stock/price triggers readable.                                                                            |
| **Payments**           | Stripe Checkout + Webhooks + Customer Portal    | Existing implementation path is already in place and matches the product.                                                        |
| **Beta Gating**        | PostHog feature flag (`paid-features`)          | Per-user targeting without redeploys, no env var sprawl. Establishes the long-term flag pattern for future closed betas.         |
| **Authorization**      | Existing Convex entitlements + `requireAdmin`   | Flags control UI exposure, not authorization. Server-side gates remain the security control even with the flag fully rolled out. |
| **Current Epic Scope** | Closed beta in prod, then polish, then roll out | Core behavior exists; gating it lets us de-risk Stripe + Resend in prod while polish work continues in parallel.                 |

## Notes

- The old launch-phase checklist has been intentionally pruned; git history is the archive.
- Current active work is centered on `app/routes/alerts.tsx`, route-level test coverage, and polish around the existing alerts/subscription experience.
- Keep route structure work separate from Convex auth/query hardening unless a dependency forces them together.
