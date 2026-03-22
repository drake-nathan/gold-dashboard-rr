> **Status:** Ready

# Query Performance Guardrails

## Goal

Reduce the highest-risk unbounded and over-reactive Convex reads in dashboard and admin paths without changing product behavior.

## Scope

- Audit and harden `dashboard.getStats` and `admin.getProductsForReview`.
- Prefer bounded reads, more targeted query surfaces, and smaller reactive payloads.
- Identify whether a point-in-time action is more appropriate than a reactive query for admin review data.

## Non-goals

- Full schema redesign or summary-table rollout unless clearly required.
- Broad performance optimization outside the named hot paths.

## Acceptance Criteria

- `dashboard.getStats` no longer relies on avoidable full-table reads for data used on every dashboard subscription update.
- Admin review data no longer subscribes to unnecessary full-table reactive payloads.
- Any new indexes or helper queries are documented in code comments or task notes where needed.
- Tests cover behavior-sensitive query changes.

## Key Files

- `convex/dashboard.ts`
- `convex/admin.ts`
- `app/routes/dashboard.tsx`
- `app/components/admin/admin-dashboard.tsx`
- `app/routes/alerts.tsx`

## Notes

- Relevant audit findings: alerts currently depend on `dashboard.getStats`, and admin review uses reactive `.collect()` reads of `costcoProducts` and `pureProducts`.
