# Observability

Canonical reference for observability architecture, instrumentation rules, and operational conventions in Dashboard.Gold.

## Purpose

This project uses observability for two distinct jobs:

- **PostHog**: product analytics, behavior events, **and error tracking**
- **Structured logs**: high-signal operational breadcrumbs for critical business workflows

If you touch PostHog, logging, or release/environment tagging, update this document with the code change.

## Source Of Truth

Use this document as the durable subsystem guide for both humans and agents.

- `AGENTS.md` should point here, not restate the strategy
- `README.md` should link here for operators and contributors
- `docs/environment-variables.md` should describe config, not observability behavior
- `.epics/observability-overhaul.md` tracks temporary rollout work and can be deleted when the overhaul ships

## Architecture

### Entry points

| Area                      | Responsibility                                               | File                                                |
| ------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| PostHog provider          | Browser SDK init, client-side error capture, default props   | `app/root.tsx`                                      |
| PostHog server client     | Node SDK singleton for server-side error capture             | `app/lib/posthog-server.ts`                         |
| React Router server hooks | `handleError` forwards uncaught loader/action errors         | `app/entry.server.tsx`                              |
| Shared identity sync      | Identify user/anonymous in PostHog and register shared props | `app/features/observability/observability-sync.tsx` |
| Shared config helpers     | Canonical environment and release normalization              | `app/lib/observability-config.js`                   |
| Noise filtering           | Drop known framework/bot/noise events before ingest          | `app/lib/posthog-event-filters.js`                  |

### Shared identity model

PostHog should consistently see the same core identifiers across both analytics and exception events:

- `anonymous_id`: stable browser-scoped fallback identity
- `user_id`: authenticated user identifier when present
- `auth_state`: `anonymous` or `authenticated`
- `environment`: canonical normalized environment name
- `release`: build/release identifier when available

Current normalization rules live in `app/lib/observability-config.js`:

- Environment vocabulary is normalized to `develop` or `production` unless a non-standard explicit value is intentionally supplied
- Release prefers `VITE_APP_RELEASE`, with server fallback to `RAILWAY_GIT_COMMIT_SHA`

## Tool Boundaries

### PostHog owns

PostHog is the single ingest point for both product and operational telemetry:

- **Product analytics**: user actions, feature usage, funnel/retention events, CTA clicks
- **Error tracking**: unhandled client and server exceptions, route/render/loader/action failures
- **Session replay** (via PostHog project settings) for context around errors and UX research
- Shared user/environment/release properties for segmenting both kinds of data

Client-side capture happens automatically via `capture_exceptions: true`; manual `posthog.captureException(error)` calls supplement React error boundaries. Server-side capture happens in `entry.server.tsx#handleError` via the `posthog-node` SDK.

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

### PostHog exception properties

Exception events (`$exception`) come with rich PostHog-managed fields. Add custom properties only when they materially improve debugging:

- `$exception_component_stack` for React error boundaries
- Domain identifiers (alert_id, subscription_id, etc.) where the call site has them
- Avoid free-form prose; prefer enum-like values that filter cleanly

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

- `VITE_APP_ENVIRONMENT` is the canonical explicit env override
- `VITE_APP_RELEASE` is the preferred shared release identifier
- Hosted builds should set `VITE_APP_RELEASE` to the git SHA
- Local development may omit `VITE_APP_RELEASE`

See `docs/environment-variables.md` for the configuration matrix and setup locations.

## Privacy And Noise

Observability is only useful if it is low-noise and safe to inspect.

- Keep the PostHog noise filters up to date in `app/lib/posthog-event-filters.js`
- Avoid sending secrets, tokens, raw payment details, or other sensitive values in PostHog properties or logs
- Treat replay and PII-bearing properties as security-sensitive and review them deliberately
- If a new class of expected noise appears, filter it close to ingest instead of training people to ignore it in the UI

## Sampling

Sampling and cost-sensitive settings should be documented here whenever they change.

Current code paths configure:

- PostHog client SDK with automatic exception capture (`capture_exceptions: true`)
- PostHog Node SDK with `flushAt: 1, flushInterval: 0` so server-side exceptions land promptly
- Session replay sampling is controlled in the PostHog project dashboard, not the code

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
- Trigger a thrown error in a route/component and verify it appears in PostHog → Error tracking with the expected identity properties
- Verify known bot/framework noise is still dropped by the filters

### Incident triage

Start with the signal type that matches the question:

- Product behavior question: PostHog → Insights / Replays
- Error or failed-request question: PostHog → Error tracking
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
