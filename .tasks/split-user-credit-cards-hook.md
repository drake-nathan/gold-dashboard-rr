> **Status:** Ready

# Split User Credit Cards Hook

## Goal
Separate migration, storage-source selection, and card CRUD orchestration so the hook is easier to change without breaking auth/storage edge cases.

## Scope
- Refactor `use-user-credit-cards` into smaller helpers or hooks with clear ownership boundaries.
- Preserve the current authenticated/anonymous behavior and migration flow.

## Non-goals
- Changing the user-cards data model.
- Reworking card UI behavior or calculator settings semantics.

## Acceptance Criteria
- The top-level hook is materially smaller and easier to scan.
- Migration logic is isolated from CRUD/update orchestration.
- Anonymous/localStorage and authenticated/Convex flows still behave the same.
- Existing browser tests continue to pass, with additions only where the refactor exposes gaps.

## Key Files
- `app/hooks/use-user-credit-cards.ts`
- `app/hooks/use-credit-cards-storage.ts`
- `app/hooks/use-user-credit-cards.browser.test.tsx`
- `app/hooks/use-user-credit-cards-migration.browser.test.tsx`

## Notes
- This task is about maintainability and agent clarity, not feature work.
