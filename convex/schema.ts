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
        v.literal("pending_approval"),
        v.literal("fallback"),
        v.literal("needs_review"),
        v.null(),
      ),
    ),
    // Approval tracking - separate from matchStatus for audit trail
    matchApprovedAt: v.optional(v.union(v.number(), v.null())),
    matchApprovedBy: v.optional(v.union(v.string(), v.null())), // Clerk user ID

    // Timestamps
    firstSeen: v.number(),
    lastUpdated: v.number(),
    lastPriceChange: v.union(v.number(), v.null()),
    lastStockChange: v.union(v.number(), v.null()),
    lastInStockAt: v.optional(v.union(v.number(), v.null())), // Timestamp when product went out of stock (last time inStock=false was recorded)

    // Product API verification - more accurate than Search API for stock status
    // Search API won't override stock status if Product API verified recently
    lastVerifiedAt: v.optional(v.union(v.number(), v.null())), // When Product API last verified this product
    verifiedInStock: v.optional(v.union(v.boolean(), v.null())), // What Product API reported for stock status
  })
    .index("by_product_id", ["productId"])
    .index("by_metal_type", ["metalType"])
    .index("by_metal_and_stock", ["metalType", "currentInStock"])
    .index("by_metal_and_price", ["metalType", "currentPricePerOunce"])
    .index("by_price_per_oz", ["currentPricePerOunce"])
    .index("by_match_status", ["matchStatus"]),

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
    .index("by_sku", ["sku"])
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

  // ============================================================================
  // User Data Tables (Phase 2: localStorage → Convex migration)
  // ============================================================================

  // User credit cards - stores custom cards and modified presets
  userCreditCards: defineTable({
    userId: v.string(), // Clerk user ID
    cardId: v.string(), // Original card ID (e.g., "freedom-unlimited" or "custom-xxx")
    name: v.string(),
    issuer: v.optional(v.string()),
    cardType: v.union(v.literal("cashback"), v.literal("travel")),
    pointsPerDollar: v.number(),
    valuePerPoint: v.number(),
    isPreset: v.boolean(), // Whether this is a preset card
    isCustomizable: v.boolean(), // Whether preset values can be customized
    signupBonus: v.optional(
      v.object({
        enabled: v.boolean(),
        pointsBonus: v.number(),
        spendRequirement: v.number(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_card", ["userId", "cardId"]),

  // User settings - calculator preferences and migration tracking
  userSettings: defineTable({
    userId: v.string(), // Clerk user ID
    lastSelectedCardId: v.optional(v.string()), // Last selected credit card
    costcoMembershipEnabled: v.boolean(), // Executive membership toggle
    localStorageMigrated: v.boolean(), // Track if migration from localStorage is complete
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // ============================================================================
  // Alerts (Phase 4)
  // ============================================================================

  alerts: defineTable({
    userId: v.string(), // Clerk user ID
    name: v.string(), // User-friendly label
    type: v.union(
      v.literal("sku"),
      v.literal("category"),
      v.literal("threshold"),
    ),
    enabled: v.boolean(),

    // Internal pause state for entitlement/billing-driven disablement
    pauseReason: v.optional(
      v.union(v.literal("billing_hold"), v.literal("inactive_subscription")),
    ),
    pausedAt: v.optional(v.number()),

    // SKU alert config
    productId: v.optional(v.string()),

    // Category alert config
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
    weight: v.optional(v.number()), // Troy ounces
    brand: v.optional(v.string()),

    // Threshold alert config
    aboveSpotThreshold: v.optional(v.number()), // e.g., 0.5 for +0.5% above spot
    profitThreshold: v.optional(v.number()), // USD

    triggerOn: v.union(
      v.literal("in_stock"),
      v.literal("price_drop"),
      v.literal("threshold_met"),
    ),

    lastTriggered: v.optional(v.number()),
    cooldownMinutes: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_enabled", ["enabled"])
    .index("by_user", ["userId"])
    .index("by_user_and_enabled", ["userId", "enabled"]),

  alertHistory: defineTable({
    alertId: v.id("alerts"),
    userId: v.string(),
    triggeredAt: v.number(),
    products: v.array(
      v.object({
        productId: v.string(),
        productName: v.string(),
        reason: v.string(),
      }),
    ),
    notificationSent: v.boolean(),
    notificationError: v.optional(v.string()),
  })
    .index("by_alert", ["alertId"])
    .index("by_user", ["userId"]),

  alertBatches: defineTable({
    userId: v.string(),
    alerts: v.array(
      v.object({
        alertId: v.id("alerts"),
        alertName: v.string(),
        products: v.array(
          v.object({
            productId: v.string(),
            productName: v.string(),
            reason: v.string(),
          }),
        ),
      }),
    ),
    scheduledFor: v.number(),
    sendAttempts: v.optional(v.number()),
    lastAttemptedAt: v.optional(v.number()),
    lastAttemptError: v.optional(v.string()),
    terminalFailureAt: v.optional(v.number()),
    sent: v.boolean(),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_pending", ["sent", "scheduledFor"])
    .index("by_user", ["userId"]),
});
