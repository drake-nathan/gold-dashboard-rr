> **Status:** In Progress
> **Started:** 2026-03-23

# File Organization Guardrails

## Goal

Tighten the app and Convex file structure so feature boundaries stay obvious, shared code stops depending on route-local code, and large modules are split before they become permanent gravity wells.

## Plan

- Keep dashboard-owned types and pure logic inside `app/routes/dashboard/*` so feature ownership matches import boundaries.
- Keep feature-owned hooks out of `app/hooks`, using feature-shared homes for reusable domains and route-local folders for dashboard-only state.
- Keep `app/lib` limited to truly shared UI or app-wide infrastructure; move domain modules to their owning features.
- Keep route entrypoints thin by extracting page body orchestration and route-local state into nearby modules.
- Continue splitting oversized route and Convex modules along feature responsibilities instead of growing top-level catch-all buckets.
- Decide whether a small set of repo-specific lint rules is still warranted after the first cleanup pass settles.

## Decisions

| Decision                                  | Choice                                         | Rationale                                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Adopt `Factory-AI/eslint-plugin` directly | No                                             | The repo itself recommends borrowing ideas instead of importing it, and several rules conflict with this codebase's co-location patterns. |
| Primary structure strategy                | Feature-first with route-local modules         | This already fits the strongest parts of the current app structure and matches the existing AGENTS guidance.                              |
| `index.tsx` policy                        | Keep real entrypoints, avoid barrel re-exports | Matches current repo conventions and avoids generic export surfaces.                                                                      |
| Guardrail strategy                        | Start with agent notes and targeted cleanup    | Cheap to maintain; add lint only for high-signal invariants that repeatedly drift.                                                        |

## Notes

- Shipped in this pass:
  - Moved dashboard-owned types from `app/types/*` into `app/routes/dashboard/*`.
  - Moved dashboard-only pure helpers/tests from `app/utils/*` into `app/routes/dashboard/calculator/*` and `app/routes/dashboard/filters/*`.
  - Removed the shared-to-route dependency leak where product filtering logic depended on route-local filter types.
  - Moved subscription hooks into `app/features/subscription/hooks/*`.
  - Moved credit-card hooks into `app/features/credit-cards/hooks/*`.
  - Moved dashboard-only settings/storage hooks into `app/routes/dashboard/calculator/hooks/*`.
  - Moved credit-card domain helpers/tests into `app/features/credit-cards/lib/*`.
  - Moved dashboard calculator fee-tier helpers/tests into `app/routes/dashboard/calculator/lib/*`.
  - Reduced `app/lib` to shared infrastructure (`cn`, Sentry filters) instead of feature/domain code.
  - Slimmed `app/routes/dashboard/index.tsx` by extracting `dashboard-content.tsx`, `use-dashboard-filters.ts`, and `use-migration-toast.ts`.
  - Slimmed `app/routes/alerts/index.tsx` by extracting `alerts-page.tsx` and `hooks/use-alerts-page.ts`.
  - Extracted the large helper prelude from `convex/alerts.ts` into `convex/alerts/helpers.ts` while keeping the registered Convex function surface stable in `convex/alerts.ts`.
  - Extracted Costco search API, matching, and product state helpers into `convex/costco/*` while keeping the registered Convex function surface stable in `convex/costco.ts`.
- Current structural smells to address:
  - Oversized Convex modules in `convex/admin.ts`; `convex/costco.ts` is thinner now but may still warrant another pass if more responsibilities accrete.
  - `convex/alerts.ts` still has a large registration surface and could be split further by CRUD/evaluation/batch processing concerns if needed.
  - Inconsistent test placement in Convex (`convex/__tests__` versus colocated tests elsewhere).
- Likely rule candidates only if notes are not enough:
  - Disallow imports from `app/routes/**` inside shared buckets such as `app/lib/**`, `app/utils/**`, and `app/hooks/**`.
  - Preserve the no-barrel rule while allowing `index.tsx` implementation entrypoints.
  - Keep tests colocated by default, with explicit exceptions where runtime/tooling requires otherwise.
