> **Status:** In Progress

# Replace Unwrangle with a Metered Costco Scraper

## Goal

Replace the flat **$100/mo Unwrangle** Costco API with a **metered, pay-per-success scraping provider** (Zyte primary) that powers the same data, relying on Costco's single category-search response and cutting the per-product hourly verification. Target: drop fixed Costco cost from ~$100/mo to **~$0–5/mo** while keeping the public dashboard's price + in-stock data fresh.

## Why (context)

The Costco feed is **load-bearing for the free dashboard** (the reason anyone visits), not just alerts. The alerts paywall was a monetization experiment that failed — PostHog since the 2026-05-21 launch shows the modal reached ~28 people (26 anonymous, **2 signed-in free**), **0 upgrade-dialog opens, 0 checkouts, 0 subscriptions**. Covering $100/mo via $8 subs would need ~13–19 buyers from a pool that produced **zero** buy-clicks — unreachable. So the fix is the cost side, which is almost entirely Unwrangle. We use <5% of its credits, and they won't offer a lower flat tier; on a flat plan, lower usage saves $0, so the lever is changing **how** we buy the data.

## Scope

1. **Provider abstraction behind an env flag.** In `convex/costco/api.ts`, introduce `COSTCO_PROVIDER` (`"unwrangle" | "zyte"`, default `"unwrangle"`) so the new path can be A/B'd against Unwrangle in prod before we cancel. Keep the public function signatures (`fetchCostcoSearchProducts`, etc.) stable so `convex/costco.ts` orchestration is untouched.
2. **Zyte search path.** Implement a Zyte API call that fetches the Costco precious-metals category via the internal search endpoint (`search.costco.com/api/apps/www_costco_com/query/www_costco_com_search`), parse the JSON, and map each product into the existing `ProcessedProduct` shape (via `extractMetalAttributes`). One or two paginated requests should cover the whole ~20–60 SKU category.
3. **Source stock + price from the search response.** Confirm the search payload carries reliable price + availability per product so the dashboard no longer needs per-product detail calls for stock.
4. **Cut the verification loop.** Reduce `verify-costco-products` drastically — either drop it entirely (if search-response stock is reliable) or reduce to a few times/day and/or limit it to products with an active alert. On a metered plan this reduction now actually saves money.
5. **Secrets + config.** Store `ZYTE_API_KEY` in Convex env vars; document `COSTCO_PROVIDER` and the key in `docs/environment-variables.md`.

## Non-goals

- Redesigning the upgrade CTA or rethinking the $8 value prop (the funnel data says that's not the problem). The dormant paywall can stay — it costs ~nothing now.
- Building a DIY Akamai bypass / self-hosted headless browser. Rejected: Costco sits behind Akamai Bot Manager and the JS sensor rotates on a tight cadence — that's an arms race, not "fix it occasionally." Outsource unblocking to the provider.
- Touching the Pure, market-price, or FMP crons.
- Restoring the donation button (tracked separately — see Notes).

## Acceptance Criteria

- Dashboard renders the same precious-metals products with accurate **price + in-stock** sourced from the new provider, verified against a live Unwrangle snapshot (parity check on a representative refresh).
- New path is toggled by `COSTCO_PROVIDER`; the Unwrangle path still works as a fallback.
- Documented request math shows projected provider cost **≤ ~$5/mo** at the chosen cadence.
- `verify-costco-products` credit burn reduced **>90%** (or the loop removed), with stock accuracy unchanged on the dashboard.
- `bun run ci` green; existing Costco tests updated/passing.
- A short runbook note: how to switch providers, where the key lives, and how to fall back to Unwrangle.

## Key Files

- `convex/costco/api.ts` — Unwrangle integration: `UNWRANGLE_API_URL` (L7), `fetchCostcoSearchProducts` (L78), `fetchCostcoProductDetails` (L119), `getUnwrangleApiKey` (L70). Add the provider abstraction here.
- `convex/costco.ts` — orchestration: `fetchNewData` (search), `verifyInStockProducts` (per-product detail loop).
- `convex/crons.ts:20-32` — `fetch-costco-search` (every 10 min) + `verify-costco-products` (hourly, 10 credits/product). Relax/retire the verify cron here.
- `convex/lib/metalParsing.ts` — `RawProduct` / `ProcessedProduct` types + `extractMetalAttributes` (the parse target shape the new provider must produce).
- `convex/costco/productState.ts` — stock-verification trust logic (`shouldTrustProductApi`); revisit once detail calls are reduced.
- `docs/environment-variables.md` — add `ZYTE_API_KEY` and `COSTCO_PROVIDER`.

## Notes

- **Endpoint:** the category grid is hydrated by `search.costco.com/api/apps/www_costco_com/query/www_costco_com_search?q=...` (Lucidworks Fusion; ~24 results/page, paginated via `start`/`page`). Returns name, URL, price, availability — the same data Unwrangle's `costco_search` platform proxies.
- **Anti-bot:** Costco is behind **Akamai Bot Manager** — datacenter IPs get 401/403 (confirmed via live probes). Use Zyte's managed unblocking (residential + JS render); do **not** attempt raw HTTP or plain headless.
- **Provider pick:** **Zyte API (PAYG)** — ~$25/mo free-usage credit, pay-per-*success* (blocked Akamai hits are free), no commitment. At ~200–600 req/mo this projects to **~$0–5/mo**. Backups: **ScraperAPI free tier** ($0 if <1k req/mo); **Bright Data Web Unlocker** (~$7–15/mo) if Zyte's Costco success rate disappoints; **Piloterr** ($49/mo) if a Costco-shaped structured drop-in is preferred over parsing raw JSON.
- **Validate first:** confirm a single category query returns all ~20–60 SKUs with reliable per-product stock. If yes → drop `verify-costco-products`. If stock in search is flaky → keep a much-reduced verification (alerted products only).
- **ToS:** scraping violates Costco's ToS, but this is the **same posture we're already in** via Unwrangle — changes the how/cost, not the exposure.
- **Sibling follow-ups (separate tasks):** restore the `buy_me_a_coffee` donation button (8 real clickers Jan–Feb 2026 vs 0 subscribers — it outperformed the paywall and was removed); leave the $8 paywall dormant. Once fixed cost is single digits, a couple of coffees/month covers it — break-even goes from "~19 subscribers" to "one coffee."
