/* eslint-disable perfectionist/sort-objects */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Main products table - one entry per SKU
  costcoProducts: defineTable({
    productId: v.string(), // Unique product ID from Costco
    retailerId: v.string(),

    // Product details (relatively static)
    name: v.string(),
    brand: v.union(v.string(), v.null()),
    categories: v.array(v.string()),
    url: v.string(),
    upc: v.union(v.string(), v.null()),
    thumbnail: v.union(v.string(), v.null()),
    shortDescription: v.union(v.string(), v.null()),

    // Metal-specific attributes
    metalType: v.union(v.literal("gold"), v.literal("silver")),
    metalWeight: v.union(v.string(), v.null()),

    // Product features
    marketingFeatures: v.union(v.array(v.string()), v.null()),
    isMemberOnly: v.union(v.boolean(), v.null()),
    isOnlineOnly: v.union(v.boolean(), v.null()),
    maxQuantity: v.union(v.number(), v.null()),

    // Current state (will be updated)
    currentPrice: v.number(),
    currentPricePerOunce: v.union(v.number(), v.null()),
    currentInStock: v.boolean(),

    // Pure product matching - only stores the pureProductId for JOIN
    // Fresh bid prices are retrieved from pureProducts table
    pureProductId: v.optional(v.union(v.string(), v.null())),
    matchStatus: v.optional(
      v.union(
        v.literal("auto_matched"),
        v.literal("manual_matched"),
        v.literal("fallback"),
        v.literal("needs_review"),
        v.null(),
      ),
    ),

    // Timestamps
    firstSeen: v.number(),
    lastUpdated: v.number(),
    lastPriceChange: v.union(v.number(), v.null()),
    lastStockChange: v.union(v.number(), v.null()),
    lastInStockAt: v.optional(v.union(v.number(), v.null())), // Timestamp when product went out of stock (last time inStock=false was recorded)
  })
    .index("by_product_id", ["productId"])
    .index("by_metal_type", ["metalType"])
    .index("by_metal_and_stock", ["metalType", "currentInStock"])
    .index("by_metal_and_price", ["metalType", "currentPricePerOunce"])
    .index("by_price_per_oz", ["currentPricePerOunce"]),

  // Price history table - tracks all price changes
  priceHistory: defineTable({
    productId: v.string(),
    price: v.number(),
    priceReduced: v.union(v.number(), v.null()),
    pricePerOunce: v.union(v.number(), v.null()),
    timestamp: v.number(),
  })
    .index("by_product_id", ["productId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_product_and_time", ["productId", "timestamp"]),

  // Stock history table - tracks stock status changes
  stockHistory: defineTable({
    productId: v.string(),
    inStock: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_product_id", ["productId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_product_and_time", ["productId", "timestamp"]),

  // Optional: Track fetch runs for debugging/monitoring
  fetchRuns: defineTable({
    source: v.union(v.literal("costco"), v.literal("collectpure")),
    timestamp: v.number(),
    productsFound: v.number(),
    productsUpdated: v.number(),
    priceChanges: v.number(),
    stockChanges: v.number(),
    creditsRemaining: v.union(v.number(), v.null()),
    error: v.union(v.string(), v.null()),
  })
    .index("by_source", ["source"])
    .index("by_timestamp", ["timestamp"]),

  // Collect Pure spot prices and bids
  collectPurePrices: defineTable({
    metalType: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("platinum"),
      v.literal("palladium"),
    ),
    spotPrice: v.number(), // Current spot price per oz
    bidPrice: v.number(), // Highest bid price per oz from Collect Pure
    askPrice: v.union(v.number(), v.null()), // Ask price if available
    timestamp: v.number(),
    isMock: v.boolean(), // Flag to identify mock data
  })
    .index("by_metal", ["metalType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_metal_and_time", ["metalType", "timestamp"]),

  // Pure products cache - stores all available Pure products for matching
  pureProducts: defineTable({
    pureProductId: v.string(), // Unique Pure product ID
    sku: v.optional(v.union(v.string(), v.null())), // SKU used in product URLs
    productName: v.string(), // Full product name from Pure
    metalType: v.union(v.literal("gold"), v.literal("silver")),
    weight: v.number(), // Weight in troy ounces
    weightGrams: v.union(v.number(), v.null()), // Original weight in grams if available
    manufacturer: v.union(v.string(), v.null()), // e.g., "PAMP Suisse"
    productType: v.union(v.string(), v.null()), // "bar", "coin", etc.
    currentBidPrice: v.union(v.number(), v.null()), // Latest total bid price
    currentBidPricePerOz: v.union(v.number(), v.null()), // Latest bid per oz
    isGenericFallback: v.optional(v.boolean()), // True for generic products used as fallbacks
    lastUpdated: v.number(),
  })
    .index("by_pure_id", ["pureProductId"])
    .index("by_metal_type", ["metalType"])
    .index("by_metal_and_weight", ["metalType", "weight"])
    .index("by_metal_weight_fallback", [
      "metalType",
      "weight",
      "isGenericFallback",
    ]),

  // Market prices from Gold API and FMP
  marketPrices: defineTable({
    symbol: v.string(), // e.g., "XAU", "XAG", "BTC", "^GSPC"
    assetType: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("bitcoin"),
      v.literal("sp500"),
    ),
    currentPrice: v.number(),
    percentChange: v.union(v.number(), v.null()), // 24h percent change (calculated from our history or from API)
    lastUpdated: v.number(),
  }).index("by_symbol", ["symbol"]),

  // Market price history - track all price updates for 24h change calculation
  marketPriceHistory: defineTable({
    symbol: v.string(),
    price: v.number(),
    timestamp: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_timestamp", ["timestamp"])
    .index("by_symbol_and_time", ["symbol", "timestamp"]),
});
