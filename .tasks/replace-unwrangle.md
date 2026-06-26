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

## Validation Findings (2026-06-14)

Live probes against Costco (throwaway scripts `scripts/probe-zyte*.ts`, `scripts/probe-bright*.ts`; keys in `.env.local`). Unwrangle ground truth: 4–5 precious-metals SKUs w/ price + in_stock.

- **Costco internal search JSON endpoint is auth-gated, not just bot-gated.** `search.costco.com/.../www_costco_com_search?q=...` returns **401 "Not Authenticated"** (Lucidworks Fusion proxy) via _both_ Zyte and Bright — i.e. reachable past Akamai but blocked by Costco's own auth. The brief's assumption that this endpoint is openly queryable is **wrong**. Drop the JSON-endpoint plan unless we reverse-engineer Costco's search token.
- **Zyte: rejected.** 100% banned on `www.costco.com` across raw HTTP, full `browserHtml` render, and automatic `productList` extraction (HTTP 520 "Website Ban", all retries). Standard tier cannot unblock Costco/Akamai.
- **Bright Data Web Unlocker (zone `gold_dashboard`, Premium domains ON): WORKS, with caveats.** `POST api.brightdata.com/request`, body `{zone, url, format:"json", country:"us"}` — **use `format:"json"`, not `"raw"`** (raw returned 0 bytes; json returns the full ~3.2MB SSR HTML). All product names, item numbers (`data-testid="ProductImage_<itemNumber>"`), 307 price tokens, and `inventory` markers present.
  - **Reliability ~50%/call:** Costco throws intermittent upstream **502** (empty body); failed calls are slow (~210s, Bright retries internally then gives up). Successes are 20–73s. → needs an app-level retry loop (≈4 tries → ~94% effective). Cron is not latency-sensitive (dashboard reads Convex), so acceptable.
  - **Parsing is non-trivial:** data is in server-rendered MUI DOM + Next.js RSC flight (`self.__next_f`), NOT clean JSON; price/stock are not adjacent to name. Build a real parser; expect breakage on Costco markup changes.
  - **TODO before wiring in:** (1) confirm Bright billing on empty 502s (cost math); (2) build parser + verify price + in_stock parity per SKU vs Unwrangle.

## Manual Validation in Dev (2026-06-14)

Built the Bright provider behind `COSTCO_PROVIDER` and ran `costco:fetchNewData` against the **dev** deployment (`dev:nautical-chickadee-997`). Implementation: `convex/costco/brightParsing.ts` (pure parsers + tests) + Bright path in `convex/costco/api.ts`.

- **Works end-to-end:** Bright path populates `costcoProducts` with correct price/stock/weight/$-per-oz; parity confirmed against a live logged-in Costco search screenshot (PAMP $719.99, Kangaroo/Dragon $1429.99).
- **ID keying (FIXED):** Unwrangle keys `productId` on the Costco **SKU** (`digitalData.sku`, e.g. `2047010`) and `retailerId` on the **item number** (`pid`, e.g. `4000439114`). First Bright cut had these swapped → every product double-inserted. Fixed in `brightDetailToProcessed` (id = sku, retailerId = pid). Verified: re-run now updates the snapshot row in place, no new dupes.
- **`run` uses deployed code:** `npx convex run` executes the dev backend's deployed functions, so local changes must be pushed first (`npx convex dev --once`). Easy to forget — first dev run silently used old Unwrangle code (tell: `creditsRemaining` was a real number, not `-1`).
- **FIXED — partial-fetch no longer marks products OOS.** Bright search now returns `discoveredItemNumbers` (every item number on the category page). The OOS sweep (`markUnseenProductsOutOfStock`) takes a `matchField`: Bright matches the catalog item numbers against stored `retailerId` (delisting detection), Unwrangle keeps "missing from search = OOS" on `productId`. A failed detail fetch leaves the product in the catalog set → keeps last-known state (no false OOS); an explicit `out of stock` from the detail page is upserted normally. If the **category** fetch fails, the run throws before the sweep, so nothing is wrongly marked. Covered by `convex/costco.convex.test.ts`. Optional later hardening: use `lastVerifiedAt` to mark a product stale if its detail 502s for many consecutive runs.
- **OPEN — runtime vs Convex action cap:** each Bright 502 costs ~200s before returning; bad spells chain across SKUs (observed runs 1–8 min). Consider fanning detail fetches out via `ctx.scheduler` (one action per product) so no single run approaches the ~10-min action limit.
- **Dev state left dirty:** repeated partial runs left orphan item-number-keyed rows + flip-flopped OOS. Re-import a snapshot (`bun run snapshot:import`) to reset. `COSTCO_PROVIDER=bright` is currently set on the dev deployment.

## Notes

- **Endpoint:** the category grid is hydrated by `search.costco.com/api/apps/www_costco_com/query/www_costco_com_search?q=...` (Lucidworks Fusion; ~24 results/page, paginated via `start`/`page`). Returns name, URL, price, availability — the same data Unwrangle's `costco_search` platform proxies.
- **Anti-bot:** Costco is behind **Akamai Bot Manager** — datacenter IPs get 401/403 (confirmed via live probes). Use Zyte's managed unblocking (residential + JS render); do **not** attempt raw HTTP or plain headless.
- **Provider pick:** **Zyte API (PAYG)** — ~$25/mo free-usage credit, pay-per-_success_ (blocked Akamai hits are free), no commitment. At ~200–600 req/mo this projects to **~$0–5/mo**. Backups: **ScraperAPI free tier** ($0 if <1k req/mo); **Bright Data Web Unlocker** (~$7–15/mo) if Zyte's Costco success rate disappoints; **Piloterr** ($49/mo) if a Costco-shaped structured drop-in is preferred over parsing raw JSON.
- **Validate first:** confirm a single category query returns all ~20–60 SKUs with reliable per-product stock. If yes → drop `verify-costco-products`. If stock in search is flaky → keep a much-reduced verification (alerted products only).
- **ToS:** scraping violates Costco's ToS, but this is the **same posture we're already in** via Unwrangle — changes the how/cost, not the exposure.
- **Sibling follow-ups (separate tasks):** restore the `buy_me_a_coffee` donation button (8 real clickers Jan–Feb 2026 vs 0 subscribers — it outperformed the paywall and was removed); leave the $8 paywall dormant. Once fixed cost is single digits, a couple of coffees/month covers it — break-even goes from "~19 subscribers" to "one coffee."
