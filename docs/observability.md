# Observability

Canonical reference for observability architecture, instrumentation rules, and operational conventions in Dashboard.Gold.

## Purpose

This project uses observability for three distinct jobs:

- **Sentry**: errors, traces, profiles, replays, and operational debugging
- **PostHog**: product analytics and behavior events
- **Structured logs**: high-signal operational breadcrumbs for critical business workflows

If you touch Sentry, PostHog, logging, tracing, or release/environment tagging, update this document with the code change.

## Source Of Truth

Use this document as the durable subsystem guide for both humans and agents.

- `AGENTS.md` should point here, not restate the strategy
- `README.md` should link here for operators and contributors
- `docs/environment-variables.md` should describe config, not observability behavior
- `.epics/observability-overhaul.md` tracks temporary rollout work and can be deleted when the overhaul ships

## Architecture

### Entry points

| Area                      | Responsibility                                                             | File                                                |
| ------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Browser Sentry bootstrap  | Client SDK init, tracing, replay, browser profiling, client-side filtering | `app/entry.client.tsx`                              |
| Server Sentry bootstrap   | Server SDK init, profiling, server-side filtering                          | `instrument.server.js`                              |
| React Router server hooks | Request wrapping, server instrumentation, SSR error handling               | `app/entry.server.tsx`                              |
| PostHog provider          | PostHog app bootstrap and default shared properties                        | `app/root.tsx`                                      |
| Shared identity sync      | Align PostHog and Sentry user/tag state                                    | `app/features/observability/observability-sync.tsx` |
| Shared config helpers     | Canonical environment and release normalization                            | `app/lib/observability-config.js`                   |
| Noise filtering           | Drop known framework/bot/noise events before ingest                        | `app/lib/sentry-event-filters.js`                   |

### Shared identity model

Both Sentry and PostHog should use the same core identifiers where possible:

- `anonymous_id`: stable browser-scoped fallback identity
- `user_id`: authenticated user identifier when present
- `auth_state`: `anonymous` or `authenticated`
- `environment`: canonical normalized environment name
- `release`: build/release identifier when available

Current normalization rules live in `app/lib/observability-config.js`:

- Environment vocabulary is normalized to `develop` or `production` unless a non-standard explicit value is intentionally supplied
- Release prefers `VITE_APP_RELEASE`, with server fallback to `RAILWAY_GIT_COMMIT_SHA`

## Tool Boundaries

### Sentry owns

Send data to Sentry when the goal is diagnosis of failures or degraded performance:

- Unhandled client and server exceptions
- Route/render/loader/action failures
- Trace and profiling data
- Session replay for error sessions
- Operational breadcrumbs attached to error and trace context
- Structured logs that help explain failures in critical flows

Do not use Sentry as the primary destination for product analytics or funnel reporting.

### PostHog owns

Send data to PostHog when the goal is product understanding:

- User actions and feature usage
- Funnel and retention events
- CTA clicks and workflow completion steps
- Shared user/environment/release properties for segmenting analytics

Do not use PostHog as the primary system for exception reporting. `capture_exceptions` stays disabled because Sentry handles error tracking.

### Structured logs own

Use structured logs for business-critical workflows where support and incident response need a timeline even when no exception is thrown.

Priority flows:

- Alerts
- Checkout/subscription
- Auth

Each log event should be machine-filterable and answer:

- What operation started or completed?
- Which actor or anonymous session was involved?
- Which workflow/entity identifiers matter?
- What was the outcome?
- If it failed, what is the failure class and retry posture?

## Naming Conventions

### PostHog events

PostHog event names should stay stable, lowercase, and action-oriented:

- Prefer `verb_noun` style names such as `alert_created`
- Reuse shared properties instead of encoding state into the event name
- Avoid one-off names that differ only by minor wording

When adding a new analytics event, document:

- The trigger point
- The required properties
- Whether the event is user-facing analytics, operational, or both

### Sentry tags and contexts

Keep a small stable set of tags that support filtering and correlation:

- `environment`
- `release`
- `auth_state`
- `anonymous_id`
- `user_id`

Add feature-specific tags only when they materially improve debugging and will remain stable over time.

### Structured log fields

Use flat, boring field names that make filtering easy:

- `workflow`
- `step`
- `status`
- `error_code`
- `user_id`
- `anonymous_id`
- `environment`
- `release`
- domain identifiers such as `alert_id`, `subscription_id`, `checkout_session_id`

Prefer predictable enums over free-form prose in filterable fields.

## Environment And Release Rules

Observability data should always be segmentable by environment and, when possible, by release.

- `VITE_SENTRY_ENVIRONMENT` is the canonical explicit env override
- `VITE_APP_RELEASE` is the preferred shared release identifier
- Local `bun run dev` sessions default to Sentry disabled, even when `VITE_SENTRY_DSN` is present
- `VITE_SENTRY_LOCAL_ENABLED=true` is the explicit opt-in for local Sentry debugging
- Hosted builds should set `VITE_APP_RELEASE` to the git SHA
- Local development may omit `VITE_APP_RELEASE`

See `docs/environment-variables.md` for the configuration matrix and setup locations.

## Privacy And Noise

Observability is only useful if it is low-noise and safe to inspect.

- Keep Sentry noise filters up to date in `app/lib/sentry-event-filters.js`
- Avoid sending secrets, tokens, raw payment details, or other sensitive values in PostHog properties, Sentry tags, or logs
- Treat replay, profiling, and `sendDefaultPii` changes as security-sensitive and review them deliberately
- If a new class of expected noise appears, filter it close to ingest instead of training people to ignore it in the UI

## Sampling

Sampling and cost-sensitive settings should be documented here whenever they change.

Current code paths configure:

- Sentry traces in browser and server bootstraps
- Browser profiling
- Replay-on-error
- Console logging integration for `warn` and `error`

When you adjust these settings, update both the code and this document with the reason.

## Change Checklist

When adding or changing observability behavior:

1. Update the implementation in the appropriate entrypoint or feature
2. Update this document if the strategy, naming, fields, or ownership changed
3. Update `docs/environment-variables.md` if config requirements changed
4. Add or update tests for filters, shared property registration, or workflow instrumentation where feasible
5. Run `bun run ci`

## Runbook

### Local verification

- Confirm the expected env vars are present
- Trigger one PostHog event and verify shared properties include `environment` and `release` when set
- Trigger one Sentry capture path and verify normalized `environment`, `release`, and identity tags
- Verify known bot/framework noise is still dropped by the Sentry filters

### Incident triage

Start with the signal type that matches the question:

- Product behavior question: PostHog
- Error or slow request question: Sentry
- Critical workflow state transition question with no exception: structured logs

Correlate across systems with shared fields:

- `user_id`
- `anonymous_id`
- `environment`
- `release`

## Current Gaps

These are intentionally tracked outside this permanent doc:

- Structured logs for alerts, checkout, and auth flows
- Alerting/runbook follow-ups that depend on the overhaul rollout

Track current work in `.epics/observability-overhaul.md` and `TASKS.md`.
