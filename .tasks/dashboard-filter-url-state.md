> **Status:** Ready

# Dashboard Filter URL State

## Goal
Make dashboard filter/search-param updates deterministic so rapid UI changes cannot overwrite each other.

## Scope
- Fix the URL-state update path in the dashboard filter controls.
- Preserve current UX, including debouncing and immediate `showOutOfStock` feedback.

## Non-goals
- Redesigning the dashboard filters UI.
- Adding new filters or changing default filter semantics.

## Acceptance Criteria
- Rapid changes to multiple filters do not clobber unrelated search params.
- Browser navigation still restores filter state correctly.
- Existing auto-flip behavior still works.
- Add focused tests for the race-prone cases.

## Key Files
- `app/components/dashboard/index.tsx`
- `app/components/dashboard/filters.tsx`
- `app/components/dashboard/filter-controls.tsx`
- `app/utils/product-filters.ts`

## Notes
- The current risk comes from debounced callbacks capturing a stale `searchParams` snapshot when composing later updates.
