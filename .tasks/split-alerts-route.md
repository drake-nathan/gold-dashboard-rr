> **Status:** Ready

# Split Alerts Route

## Goal
Reduce `app/routes/alerts.tsx` to a route container with clearer ownership boundaries for form state, list UI, and auth/loading states.

## Scope
- Split `app/routes/alerts.tsx` into smaller modules with stable seams.
- Separate page-level data loading/mutations from alert form rendering and alert list/item presentation.
- Preserve current behavior and route API.

## Non-goals
- Reworking alert product data sources in this task.
- Redesigning the alerts feature or changing entitlements logic.

## Acceptance Criteria
- The route file is materially smaller and primarily orchestrates subcomponents.
- Form helpers and edit/create state live outside the top-level route module.
- Behavior, mutation flow, and URL param handling remain unchanged.
- Existing tests still pass; add focused UI coverage only if the extraction exposes gaps.

## Key Files
- `app/routes/alerts.tsx`
- `app/components/subscription/*`
- `app/components/ui/*`
- `app/hooks/use-subscription.ts`

## Notes
- This is structural work. Keep product-option-query changes separate unless they are required to complete the split cleanly.
