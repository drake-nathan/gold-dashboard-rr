> **Status:** In Progress

# Observability Overhaul

## Goal

Document a clear observability strategy for PostHog (analytics + error tracking), structured logs, and operational workflows so both humans and agents use the same source of truth.

## Plan

- Establish `docs/observability.md` as the canonical observability reference and link it from repo entrypoints (`AGENTS.md`, `README.md`, env docs).
- Define the operating model:
  - What data belongs in PostHog vs structured logs
  - Shared identity, environment, and release conventions
  - Privacy, sampling, and noise filtering expectations
- Follow up with implementation work for structured logs and alerting:
  - Alerts flow
  - Checkout/subscription flow
  - Auth flow

## Decisions

| Topic            | Decision                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Vendor           | PostHog is the single ingest point for analytics and error tracking; Sentry was removed.                             |
| Canonical doc    | `docs/observability.md` is the durable source of truth for observability architecture and operating rules.           |
| Agent guidance   | `AGENTS.md` should point to the canonical observability doc instead of embedding vendor details.                     |
| Rollout tracking | Multi-session observability work stays in this epic; bounded subprojects can branch into `.tasks/*.md` briefs later. |
| README scope     | `README.md` stays onboarding-focused and links to observability docs instead of duplicating strategy detail.         |

## Notes

- Existing observability code is already centralized enough to document cleanly:
  - PostHog browser bootstrap: `app/root.tsx` (`PostHogProvider` with `capture_exceptions: true`)
  - PostHog Node singleton: `app/lib/posthog-server.ts`
  - Server `handleError` hook: `app/entry.server.tsx`
  - Shared identity/property sync: `app/features/observability/observability-sync.tsx`
  - Noise filters: `app/lib/posthog-event-filters.js`
- Current tracked follow-up already in `TASKS.md`:
  - `Structured logs for alerts, checkout, and auth flows`
