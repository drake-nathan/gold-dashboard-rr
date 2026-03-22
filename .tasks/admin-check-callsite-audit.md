> **Status:** Ready

# Admin Check Callsite Audit

## Goal
Verify whether unconditional `checkIsAdmin` queries in shared navigation are necessary, and reduce avoidable public requests if they are not.

## Scope
- Audit the admin-check usage in shared header/mobile navigation.
- Decide whether the current query behavior is acceptable or should be gated/deferred.

## Non-goals
- Reworking admin authorization itself.
- Changing admin access policy.

## Acceptance Criteria
- Each shared-navigation `checkIsAdmin` callsite has an intentional rationale or a better gating strategy.
- Any changes preserve the current admin affordance behavior.
- The final state does not add more auth complexity than it removes.

## Key Files
- `app/components/header/header-actions.tsx`
- `app/components/header/mobile-menu.tsx`
- `app/routes/admin.tsx`
- `convex/admin.ts`

## Notes
- This is partly a perf concern and partly a repo-clarity concern: avoid hidden network work in globally rendered chrome unless it is clearly justified.
