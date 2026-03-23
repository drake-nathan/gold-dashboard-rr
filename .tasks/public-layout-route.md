> **Status:** In Progress

# Public Layout Route

## Goal

Move shared public page chrome into a layout route so dashboard and alerts stop duplicating app-shell responsibilities.

## Scope

- Introduce a shared public layout for the signed-in/signed-out user-facing pages.
- Keep admin isolated from the public app shell.
- Preserve current header/footer behavior and route URLs.

## Non-goals

- Redesigning the app shell.
- Reworking admin layout at the same time.

## Acceptance Criteria

- Dashboard and alerts share a route layout for common chrome.
- Header/footer duplication is removed from page-level modules.
- Route behavior, SEO metadata, and error handling remain correct.

## Key Files

- `app/routes.ts`
- `app/routes/dashboard.tsx`
- `app/routes/alerts.tsx`
- `app/components/header/*`
- `app/components/footer.tsx`

## Notes

- This is mainly a composition cleanup to reduce duplication and make page-level modules easier to reason about.
