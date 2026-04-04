> **Status:** In Progress

# Observability Overhaul

## Goal

Document a clear observability strategy for Sentry, PostHog, logs, tracing, and operational workflows so both humans and agents use the same source of truth.

## Plan

- Establish `docs/observability.md` as the canonical observability reference and link it from repo entrypoints (`AGENTS.md`, `README.md`, env docs, legacy vendor notes).
- Define the operating model:
  - What data belongs in Sentry vs PostHog vs structured logs
  - Shared identity, environment, and release conventions
  - Privacy, sampling, and noise filtering expectations
- Follow up with implementation work for structured logs and alerting:
  - Alerts flow
  - Checkout/subscription flow
  - Auth flow

## Decisions

| Topic            | Decision                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Canonical doc    | `docs/observability.md` is the durable source of truth for observability architecture and operating rules.           |
| Agent guidance   | `AGENTS.md` should point to the canonical observability doc instead of embedding vendor details.                     |
| Rollout tracking | Multi-session observability work stays in this epic; bounded subprojects can branch into `.tasks/*.md` briefs later. |
| README scope     | `README.md` stays onboarding-focused and links to observability docs instead of duplicating strategy detail.         |

## Notes

- Existing observability code is already centralized enough to document cleanly:
  - Browser Sentry bootstrap: `app/entry.client.tsx`
  - Server Sentry bootstrap: `instrument.server.js`
  - Request/error hooks: `app/entry.server.tsx`
  - PostHog provider: `app/root.tsx`
  - Shared identity/tag sync: `app/features/observability/observability-sync.tsx`
- Current tracked follow-up already in `TASKS.md`:
  - `Sentry: structured logs for alerts, checkout, and auth flows`
