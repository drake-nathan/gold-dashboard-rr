> **Status:** In Progress
> **Started:** 2024-12-27

# Alerts & Subscriptions

## Goal

Finish the alerts/subscriptions feature to production quality by tightening the route structure, closing the main UI polish gaps, and adding the missing route-level confidence for the user flows that already exist.

## Plan

- Finish the active `alerts` route cleanup so the route module becomes an orchestrator instead of the main implementation surface.
- Close the highest-signal UI polish and coverage gaps around `/alerts`, subscription gating, and shared public chrome.

## Completed

- Phase 0-3 work shipped previously; the core alerts/subscriptions stack is already in the repo.
- Phase 4 core shipped: alert CRUD, evaluation engine, batched email digests, and the main `/alerts` route/UI.
- Convex-side coverage is already substantial for alerts evaluation, batching, unsubscribe behavior, and subscription-state interactions.
- Hook/component coverage exists for subscription state, upgrade flow, and portal flow, so the main confidence gap is route-level behavior rather than basic primitives.

## Remaining

- Split `app/routes/alerts.tsx` into smaller modules with stable seams.
  Source of truth: `TASKS.md` Now and `.tasks/split-alerts-route.md`
- Add focused route/browser tests for dashboard filters, alerts flows, and admin access, with alerts called out explicitly.
  Source of truth: `TASKS.md` Up Next and `.tasks/route-test-coverage.md`
- Polish the `/alerts` experience around empty/loading/error states and responsive behavior.
  Source of truth: this epic and `TASKS.md` Now
- Decide whether shared public chrome should move into a layout route for dashboard and alerts.
  Source of truth: `TASKS.md` Up Next and `.tasks/public-layout-route.md`
- Test alerts and subscription flows on real mobile devices.
  Source of truth: `TASKS.md` Up Next
- Add fallback and observability follow-ups that materially affect alerts UX and supportability.
  Source of truth: `TASKS.md` Up Next (`Fallback UI when market prices fail`, `Sentry: structured logs for alerts, checkout, and auth flows`)

## Exit Criteria

- `app/routes/alerts.tsx` is reduced to a route container with form/list/auth concerns split into smaller modules.
- `/alerts` has focused browser coverage for signed-out gating and at least one signed-in happy path.
- The alerts/subscription UI handles loading, empty, and error states intentionally on desktop and mobile.
- Shared chrome decisions for dashboard/alerts are settled enough that alerts UI ownership is clear.
- Remaining supportability gaps that directly affect alerts flows are either shipped or explicitly moved out of this epic.

## Decisions

| Decision              | Choice                                      | Rationale                                                                 |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| **Notifications**     | Email only (via Resend)                     | SMS still adds operational and compliance overhead; defer it.             |
| **Alert Timing**      | Batched digests                             | Reduces spam and keeps stock/price triggers readable.                     |
| **Payments**          | Stripe Checkout + Webhooks + Customer Portal| Existing implementation path is already in place and matches the product. |
| **Current Epic Scope**| Polish, structure, and confidence           | Core behavior exists; the gap is maintainability and user-facing finish.  |

## Notes

- The old launch-phase checklist has been intentionally pruned; git history is the archive.
- Current active work is centered on `app/routes/alerts.tsx`, route-level test coverage, and polish around the existing alerts/subscription experience.
- Keep route structure work separate from Convex auth/query hardening unless a dependency forces them together.
