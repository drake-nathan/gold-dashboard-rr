> **Status:** Ready

# Route Test Coverage

## Goal
Add high-signal route-level tests around the main flows that are currently excluded from coverage and lightly protected.

## Scope
- Add browser-mode tests for dashboard filters/search params, alerts route auth and CRUD flow, and admin access gating.
- Focus on user-visible route behavior, not broad snapshot coverage.

## Non-goals
- Chasing high percentage coverage for every route branch.
- Replacing focused hook/component tests that already exist.

## Acceptance Criteria
- Dashboard route tests cover filter/search-param behavior.
- Alerts route tests cover signed-out gating and at least one signed-in happy path.
- Admin route tests cover signed-out, unauthorized, and authorized behavior.
- Test names and structure make the intent obvious to a cold reader.

## Key Files
- `app/routes/dashboard.tsx`
- `app/routes/alerts.tsx`
- `app/routes/admin.tsx`
- `vitest.browser.config.ts`
- `docs/browser-testing.md`

## Notes
- Coverage config intentionally excludes `routes/**` and `root.tsx`; this task closes that confidence gap with focused browser tests instead of coverage-chasing.
