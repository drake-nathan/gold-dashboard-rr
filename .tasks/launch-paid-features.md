> **Status:** Ready to Ship

# Launch: Paid Features (Phase 1)

## Goal

Ship the public launch of paid alerts to current site visitors, with full PostHog funnel instrumentation so we can decide whether to proceed to Phase 2 (Resend email blast) and Phase 3 (forum repost) based on real conversion data.

## Phasing Context

- **Phase 1 (this task):** Convert current site visitors. Validate the funnel end-to-end.
- **Phase 2 (later):** Resend email blast to the ~20 existing account holders.
- **Phase 3 (later):** Re-post to the points-hacking forum where the site was originally advertised.

Break-even target is ~25 paid subs at $8/mo to cover ~$200/mo infra. Phase 1's job is funnel validation, not break-even.

## Scope

### 1. Rework the announcement modal as a conversion CTA

`app/components/feature-announcement-modal.tsx` is currently announcement-shaped (title "Alerts are live", CTA "See Alerts" → `/alerts`). Rework as a conversion surface:

- **Signed-in free users:** primary CTA opens `UpgradeDialog` (price + Stripe checkout visible). Surface "$8/mo" in the modal itself. Secondary "See Alerts" ghost button stays for the curious.
- **Anonymous returning visitors** (2nd+ visit, current gate retained): primary CTA routes to `/alerts` (the rebuilt pitch page — see item 6). No price-forward pitch on the modal itself; the page does that work.

### 2. Modal dismissal policy

- Explicit dismissal (Maybe Later, See Alerts, CTA click) → permanent (current behavior).
- Accidental close (outside-click, Esc) → session-only. Only call `handleDismiss()` when the close originates from an explicit button, not from the dialog's `onOpenChange` going false for other reasons.
- Keep the in-memory `hasDismissedInSession` mirror so dismissal visibly closes the modal.

### 3. Centralize the upgrade dialog trigger

Currently `UpgradeDialog` state is owned by `UpgradeButton` ([app/components/subscription/upgrade-button.tsx](app/components/subscription/upgrade-button.tsx)), so external callers can't open it. Lift the dialog state into a provider + `useUpgradeFlow()` hook returning `{ open: (source: string) => void }`. `UpgradeButton`, the announcement modal, and any future surfaces become consumers. The `source` arg auto-fires `upgrade_dialog_opened` with consistent properties.

### 4. Full upgrade-funnel PostHog instrumentation

Today the entire subscription path has zero PostHog events. Add (client-side `posthog.capture` unless noted):

- `announcement_modal_shown` ({ audience: "signed_in_free" | "anonymous" })
- `announcement_modal_cta_clicked` ({ cta: "upgrade" | "see_alerts" | "sign_up", audience })
- `announcement_modal_dismissed` ({ method: "maybe_later" | "outside_click" | "esc" })
- `upgrade_dialog_opened` ({ source: "announcement_modal" | "header" | "alerts_page" | "product_card" | ... })
- `upgrade_checkout_started` (from `createCheckout` in [app/components/subscription/upgrade-button.tsx](app/components/subscription/upgrade-button.tsx))
- `subscription_activated` (server-side capture from the Stripe webhook in Convex)

Verify `alert_created` ([app/routes/alerts/hooks/use-alerts-page.ts:31](app/routes/alerts/hooks/use-alerts-page.ts:31)) still fires post-launch. Check whether any event fires when a digest/alert email is actually sent from `convex/digests.ts` or `convex/alerts/`; add one if missing (e.g., `alert_email_sent`).

### 5. Add an "Alerts" header link for signed-out users

[app/components/header/header-actions.tsx:17](app/components/header/header-actions.tsx:17) only renders Sign In / Sign Up for signed-out users. Add a passive "Alerts" link (same `Bell` icon, `outline` size="sm") routing to `/alerts`. Mirror in mobile-menu. This is the anonymous first-visit discovery breadcrumb the modal-gate intentionally avoids.

### 6. Rebuild the signed-out `/alerts` page as the anonymous pitch surface

Today the signed-out branch ([app/routes/alerts/alerts-page.tsx:191-203](app/routes/alerts/alerts-page.tsx:191)) is a near-dead-end: title "Alerts", subtitle "Sign in to manage your alerts", a raw Clerk SignIn form. Replace with a real pitch page:

- Headline tied to user benefit, not feature name.
- The two value props from the modal (price/restock alerts, batched email digests).
- Price stated up front ($8/mo).
- Primary CTA: sign-up flow (Clerk), redirecting back to `/alerts` post-auth so the existing amber upgrade banner + `UpgradeButton` finishes the conversion.
- Secondary: "Already have an account? Sign in".

All three anonymous breadcrumbs (header link, product-card bell, 2nd-visit modal) converge here.

## Non-goals

- Removing the 2-visit gate for anonymous users. Keep it: first-visit pitching is hostile UX.
- Removing the announcement-modal expiration date.
- Designing a re-show / multi-impression strategy. One-shot model. If copy needs to change mid-Phase-1, bump the `DISMISSED_KEY` namespace (e.g., `announcement-alerts-launch-dismissed-v2`) to give everyone a fresh impression.
- Building a dedicated `/pricing` route. The modal + `UpgradeDialog` + rebuilt `/alerts` cover the pitch surfaces.
- Email blast or forum repost. Those are Phase 2 / 3.

## Acceptance Criteria

- Signed-in free user with `PAID_FEATURES` flag on sees the modal on first eligible visit; primary CTA opens `UpgradeDialog` with $8/mo + Stripe button.
- Anonymous user on their 2nd+ visit sees the modal; primary CTA routes to `/alerts`.
- Anonymous user on any visit sees an "Alerts" entry in the header and mobile menu.
- Anonymous user landing on `/alerts` sees a pitch page with price + sign-up CTA, not a bare SignIn wall.
- Dismissing via outside-click or Esc does not persist; clicking Maybe Later does.
- PostHog funnel from `announcement_modal_shown` → `subscription_activated` is queryable with no missing steps.
- `bun run ci` passes.
- A funnel-review follow-up exists in `TASKS.md` (already added).

## Key Files

- `app/components/feature-announcement-modal.tsx` — modal rework, dismissal policy, instrumentation, kill `dialog-from-dialog` by using `useUpgradeFlow()`.
- `app/components/subscription/upgrade-button.tsx` — refactor to consume the new dialog provider; emit `upgrade_checkout_started`.
- `app/components/subscription/upgrade-dialog.tsx` — emit `upgrade_dialog_opened` when shown.
- `app/components/header/header-actions.tsx` + `app/components/header/mobile-menu.tsx` — add signed-out Alerts link.
- `app/routes/alerts/alerts-page.tsx` — rebuild signed-out branch.
- `convex/stripe*.ts` (Stripe webhook handler) — server-side `subscription_activated` capture.
- `convex/digests.ts` / `convex/alerts/` — check whether sent-email events exist; add if missing.

## Notes

- The `MIN_VISITS_FOR_ANON_MODAL = 2` gate and the module-level visit-counter side effect stay. Don't simplify them away.
- The Stripe webhook capture is the trickiest piece — server-side PostHog needs the right identity (the Clerk userId) attached so the event lands on the same person as the client-side modal/checkout events. See [app/lib/posthog-server.ts](app/lib/posthog-server.ts) for the existing server-side pattern.
- Suggested PR sequence if splitting commits: (a) `useUpgradeFlow` provider + UpgradeButton refactor, (b) modal rework + instrumentation, (c) header link + signed-out /alerts pitch page, (d) Stripe webhook capture.
