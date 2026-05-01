import { expect, test } from "vitest";

import type { Doc } from "./_generated/dataModel";
import {
  buildDigestRowsFromProducts,
  type DigestProductRow,
  formatMarketDigest,
  isDigestEligibleNow,
} from "./digests";

const baseProduct: Omit<
  Doc<"costcoProducts">,
  "currentPrice" | "currentPricePerOunce" | "metalType" | "name" | "productId" | "pureProductId"
> = {
  _creationTime: 0,
  _id: "x" as Doc<"costcoProducts">["_id"],
  brand: "Test",
  categories: [],
  currentInStock: true,
  firstSeen: 0,
  isMemberOnly: false,
  isOnlineOnly: false,
  lastPriceChange: null,
  lastStockChange: null,
  lastUpdated: 0,
  marketingFeatures: null,
  maxQuantity: null,
  metalWeight: "1 oz",
  retailerId: "costco",
  shortDescription: null,
  thumbnail: null,
  upc: null,
  url: "https://www.costco.com/test.html",
};

const goldProduct = {
  ...baseProduct,
  currentPrice: 105,
  currentPricePerOunce: 105,
  metalType: "gold" as const,
  name: "Gold Round",
  productId: "gold-1",
  pureProductId: "pure-gold-1",
};

const silverProduct = {
  ...baseProduct,
  currentPrice: 35,
  currentPricePerOunce: 35,
  metalType: "silver" as const,
  name: "Silver Bar",
  productId: "silver-1",
  pureProductId: null,
};

const outOfStockProduct = {
  ...goldProduct,
  currentInStock: false,
  productId: "gold-2",
};

test("buildDigestRowsFromProducts skips out-of-stock and computes markup with matched bid first", () => {
  const rows = buildDigestRowsFromProducts(
    [goldProduct, silverProduct, outOfStockProduct],
    new Map([["pure-gold-1", 100]]),
    new Map([
      ["gold", 99],
      ["silver", 30],
    ]),
  );

  const ids = rows.map((row) => row.productName);
  expect(ids).toEqual(["Gold Round", "Silver Bar"]);

  const gold = rows.find((row) => row.metalType === "gold");
  expect(gold?.bidPerOunce).toBe(100);
  expect(gold?.markupPercent).toBeCloseTo(5);

  const silver = rows.find((row) => row.metalType === "silver");
  expect(silver?.bidPerOunce).toBe(30);
  expect(silver?.markupPercent).toBeCloseTo(((35 - 30) / 30) * 100);
});

test("buildDigestRowsFromProducts sorts gold before silver and best markup first within metal", () => {
  const cheaperGold = {
    ...goldProduct,
    currentPrice: 101,
    currentPricePerOunce: 101,
    name: "Cheap Gold",
    productId: "gold-cheap",
    pureProductId: "pure-gold-1",
  };
  const rows = buildDigestRowsFromProducts(
    [silverProduct, goldProduct, cheaperGold],
    new Map([["pure-gold-1", 100]]),
    new Map([
      ["gold", 99],
      ["silver", 30],
    ]),
  );

  expect(rows.map((row) => row.productName)).toEqual(["Cheap Gold", "Gold Round", "Silver Bar"]);
});

test("formatMarketDigest renders cadence label, totals, table headers, and unsubscribe link", () => {
  const rows: DigestProductRow[] = [
    {
      bidPerOunce: 100,
      markupPercent: 1,
      metalType: "gold",
      pricePerOunce: 101,
      productName: "Gold Round",
      totalPrice: 101,
      url: "https://www.costco.com/gold-round.html",
    },
  ];

  const digest = formatMarketDigest(rows, {
    frequency: "weekly",
    siteUrl: "https://dashboard.gold",
    unsubscribeUrl: "https://example.com/unsubscribe?token=abc&kind=digest",
  });

  expect(digest.subject).toBe("Dashboard.Gold Weekly Digest: 1 item in stock");
  expect(digest.html).toContain("Weekly digest");
  expect(digest.html).toContain("Gold Round");
  expect(digest.html).toContain("$101.00");
  expect(digest.html).toContain("+1.00%");
  expect(digest.html).toContain("https://dashboard.gold/dashboard");
  expect(digest.html).toContain("https://example.com/unsubscribe?token=abc&kind=digest");
  expect(digest.text).toContain("Dashboard.Gold Weekly Digest");
  expect(digest.text).toContain("Stop receiving this digest");
});

test("formatMarketDigest produces empty-state copy when no rows", () => {
  const digest = formatMarketDigest([], { frequency: "daily" });
  expect(digest.subject).toBe("Dashboard.Gold Daily Digest: 0 items in stock");
  expect(digest.html).toContain("Nothing currently in stock");
});

test("isDigestEligibleNow respects off and dedupe window", () => {
  const now = Date.UTC(2026, 3, 28, 15, 0); // Tuesday 15:00 UTC
  expect(isDigestEligibleNow("off", { evaluatedAtUtc: now, weeklyDayOfWeek: 1 })).toBeFalsy();

  expect(
    isDigestEligibleNow("daily", {
      evaluatedAtUtc: now,
      lastSentAt: now - 60_000,
      weeklyDayOfWeek: 1,
    }),
  ).toBeFalsy();

  expect(
    isDigestEligibleNow("daily", {
      evaluatedAtUtc: now,
      lastSentAt: now - 24 * 60 * 60 * 1000,
      weeklyDayOfWeek: 1,
    }),
  ).toBeTruthy();
});

test("isDigestEligibleNow weekly fires on configured day only", () => {
  const monday = Date.UTC(2026, 3, 27, 15, 0); // Monday 15:00 UTC
  const tuesday = Date.UTC(2026, 3, 28, 15, 0);

  expect(
    isDigestEligibleNow("weekly", { evaluatedAtUtc: monday, weeklyDayOfWeek: 1 }),
  ).toBeTruthy();
  expect(
    isDigestEligibleNow("weekly", { evaluatedAtUtc: tuesday, weeklyDayOfWeek: 1 }),
  ).toBeFalsy();
});
