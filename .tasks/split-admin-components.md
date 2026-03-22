> **Status:** Ready

# Split Admin Components

## Goal
Reduce the size and responsibility sprawl of the admin UI components so review and follow-on changes are safer.

## Scope
- Split oversized admin components into stable subcomponents and helpers.
- Prioritize `product-match-card` and `admin-dashboard`.
- Keep current admin workflows and visual behavior intact.

## Non-goals
- Changing admin feature behavior or matching logic.
- Reworking Convex admin APIs as part of this UI task.

## Acceptance Criteria
- The top-level admin components are materially smaller and primarily orchestration-focused.
- Dialogs, lists, and action clusters are extracted into clearer modules.
- Existing behavior and mutation wiring remain intact.

## Key Files
- `app/components/admin/admin-dashboard.tsx`
- `app/components/admin/product-match-card.tsx`
- `app/routes/admin.tsx`

## Notes
- Keep write scopes intentional. Avoid splitting into tiny files with no ownership value.
