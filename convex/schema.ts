import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  alertBatches: defineTable({
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
    createdAt: v.number(),
    lastAttemptedAt: v.optional(v.number()),
    lastAttemptError: v.optional(v.string()),
    scheduledFor: v.number(),
    sendAttempts: v.optional(v.number()),
    sent: v.boolean(),
    sentAt: v.optional(v.number()),
    terminalFailureAt: v.optional(v.number()),
    userId: v.string(),
  })
    .index("by_pending", ["sent", "scheduledFor"])
    .index("by_user", ["userId"]),

  alertHistory: defineTable({
    alertId: v.id("alerts"),
    notificationError: v.optional(v.string()),
    notificationSent: v.boolean(),
    products: v.array(
      v.object({
        productId: v.string(),
        productName: v.string(),
        reason: v.string(),
      }),
    ),
    triggeredAt: v.number(),
    userId: v.string(),
  })
    .index("by_alert", ["alertId"])
    .index("by_user", ["userId"]),

  alerts: defineTable({
    // Threshold alert config
    aboveSpotThreshold: v.optional(v.number()), // e.g., 0.5 for +0.5% above spot
    brand: v.optional(v.string()),
    cooldownMinutes: v.number(),
    createdAt: v.number(),

    enabled: v.boolean(),
    lastTriggered: v.optional(v.number()),

    // Category alert config
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),

    name: v.string(), // User-friendly label
    pausedAt: v.optional(v.number()),
    // Internal pause state for entitlement/billing-driven disablement
    pauseReason: v.optional(v.union(v.literal("billing_hold"), v.literal("inactive_subscription"))),

    // SKU alert config
    productId: v.optional(v.string()),
    profitThreshold: v.optional(v.number()), // USD

    triggerOn: v.union(v.literal("in_stock"), v.literal("price_drop"), v.literal("threshold_met")),

    type: v.union(v.literal("sku"), v.literal("category"), v.literal("threshold")),
    updatedAt: v.number(),
    userId: v.string(), // Clerk user ID
    weight: v.optional(v.number()), // Troy ounces
  })
    .index("by_enabled", ["enabled"])
    .index("by_user", ["userId"])
    .index("by_user_and_enabled", ["userId", "enabled"]),

  // Collect Pure spot prices and bids
  collectPurePrices: defineTable({
    askPrice: v.union(v.number(), v.null()), // Ask price if available
    bidPrice: v.number(), // Highest bid price per oz from Collect Pure
    isMock: v.boolean(), // Flag to identify mock data
    metalType: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("platinum"),
      v.literal("palladium"),
    ),
    spotPrice: v.number(), // Current spot price per oz
    timestamp: v.number(),
  })
    .index("by_metal", ["metalType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_metal_and_time", ["metalType", "timestamp"]),

  // Main products table - one entry per SKU
  costcoProducts: defineTable({
    brand: v.union(v.string(), v.null()),
    categories: v.array(v.string()),

    currentInStock: v.boolean(),
    // Current state (will be updated)
    currentPrice: v.number(),
    currentPricePerOunce: v.union(v.number(), v.null()),
    // Timestamps
    firstSeen: v.number(),
    isMemberOnly: v.union(v.boolean(), v.null()),
    isOnlineOnly: v.union(v.boolean(), v.null()),
    lastInStockAt: v.optional(v.union(v.number(), v.null())), // Timestamp when product went out of stock (last time inStock=false was recorded)

    lastPriceChange: v.union(v.number(), v.null()),
    lastStockChange: v.union(v.number(), v.null()),

    lastUpdated: v.number(),
    // Product API verification - more accurate than Search API for stock status
    // Search API won't override stock status if Product API verified recently
    lastVerifiedAt: v.optional(v.union(v.number(), v.null())), // When Product API last verified this product
    // Product features
    marketingFeatures: v.union(v.array(v.string()), v.null()),
    // Approval tracking - separate from matchStatus for audit trail
    matchApprovedAt: v.optional(v.union(v.number(), v.null())),

    matchApprovedBy: v.optional(v.union(v.string(), v.null())), // Clerk user ID
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
    maxQuantity: v.union(v.number(), v.null()),

    // Metal-specific attributes
    metalType: v.union(v.literal("gold"), v.literal("silver")),
    metalWeight: v.union(v.string(), v.null()),
    // Product details (relatively static)
    name: v.string(),
    productId: v.string(), // Unique product ID from Costco

    // Pure product matching - only stores the pureProductId for JOIN
    // Fresh bid prices are retrieved from pureProducts table
    pureProductId: v.optional(v.union(v.string(), v.null())),
    retailerId: v.string(),
    shortDescription: v.union(v.string(), v.null()),
    thumbnail: v.union(v.string(), v.null()),
    upc: v.union(v.string(), v.null()),

    url: v.string(),
    verifiedInStock: v.optional(v.union(v.boolean(), v.null())), // What Product API reported for stock status
  })
    .index("by_product_id", ["productId"])
    .index("by_metal_type", ["metalType"])
    .index("by_metal_and_stock", ["metalType", "currentInStock"])
    .index("by_metal_and_price", ["metalType", "currentPricePerOunce"])
    .index("by_price_per_oz", ["currentPricePerOunce"])
    .index("by_match_status", ["matchStatus"]),

  // Optional: Track fetch runs for debugging/monitoring
  fetchRuns: defineTable({
    creditsRemaining: v.union(v.number(), v.null()),
    error: v.union(v.string(), v.null()),
    priceChanges: v.number(),
    productsFound: v.number(),
    productsUpdated: v.number(),
    source: v.union(v.literal("costco"), v.literal("collectpure")),
    stockChanges: v.number(),
    timestamp: v.number(),
  })
    .index("by_source", ["source"])
    .index("by_timestamp", ["timestamp"]),

  // Market price history - track all price updates for 24h change calculation
  marketPriceHistory: defineTable({
    price: v.number(),
    symbol: v.string(),
    timestamp: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_timestamp", ["timestamp"])
    .index("by_symbol_and_time", ["symbol", "timestamp"]),

  // Market prices from Gold API and FMP
  marketPrices: defineTable({
    assetType: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("bitcoin"),
      v.literal("sp500"),
    ),
    currentPrice: v.number(),
    lastUpdated: v.number(),
    percentChange: v.union(v.number(), v.null()), // 24h percent change (calculated from our history or from API)
    symbol: v.string(), // e.g., "XAU", "XAG", "BTC", "^GSPC"
  }).index("by_symbol", ["symbol"]),

  // ============================================================================
  // User Data Tables (Phase 2: localStorage → Convex migration)
  // ============================================================================

  // Price history table - tracks all price changes
  priceHistory: defineTable({
    price: v.number(),
    pricePerOunce: v.union(v.number(), v.null()),
    priceReduced: v.union(v.number(), v.null()),
    productId: v.string(),
    timestamp: v.number(),
  })
    .index("by_product_id", ["productId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_product_and_time", ["productId", "timestamp"]),

  // Pure products cache - stores all available Pure products for matching
  pureProducts: defineTable({
    currentBidPrice: v.union(v.number(), v.null()), // Latest total bid price
    currentBidPricePerOz: v.union(v.number(), v.null()), // Latest bid per oz
    isGenericFallback: v.optional(v.boolean()), // True for generic products used as fallbacks
    lastUpdated: v.number(),
    manufacturer: v.union(v.string(), v.null()), // e.g., "PAMP Suisse"
    metalType: v.union(v.literal("gold"), v.literal("silver")),
    productName: v.string(), // Full product name from Pure
    productType: v.union(v.string(), v.null()), // "bar", "coin", etc.
    pureProductId: v.string(), // Unique Pure product ID
    sku: v.optional(v.union(v.string(), v.null())), // SKU used in product URLs
    weight: v.number(), // Weight in troy ounces
    weightGrams: v.union(v.number(), v.null()), // Original weight in grams if available
  })
    .index("by_pure_id", ["pureProductId"])
    .index("by_sku", ["sku"])
    .index("by_metal_type", ["metalType"])
    .index("by_metal_and_weight", ["metalType", "weight"])
    .index("by_metal_weight_fallback", ["metalType", "weight", "isGenericFallback"]),

  // ============================================================================
  // Alerts (Phase 4)
  // ============================================================================

  // Stock history table - tracks stock status changes
  stockHistory: defineTable({
    inStock: v.boolean(),
    productId: v.string(),
    timestamp: v.number(),
  })
    .index("by_product_id", ["productId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_product_and_time", ["productId", "timestamp"]),

  // User credit cards - stores custom cards and modified presets
  userCreditCards: defineTable({
    cardId: v.string(), // Original card ID (e.g., "freedom-unlimited" or "custom-xxx")
    cardType: v.union(v.literal("cashback"), v.literal("travel")),
    createdAt: v.number(),
    isCustomizable: v.boolean(), // Whether preset values can be customized
    isPreset: v.boolean(), // Whether this is a preset card
    issuer: v.optional(v.string()),
    name: v.string(),
    pointsPerDollar: v.number(),
    signupBonus: v.optional(
      v.object({
        enabled: v.boolean(),
        pointsBonus: v.number(),
        spendRequirement: v.number(),
      }),
    ),
    updatedAt: v.number(),
    userId: v.string(), // Clerk user ID
    valuePerPoint: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_card", ["userId", "cardId"]),

  // User settings - calculator preferences and migration tracking
  userSettings: defineTable({
    costcoMembershipEnabled: v.boolean(), // Executive membership toggle
    createdAt: v.number(),
    lastSelectedCardId: v.optional(v.string()), // Last selected credit card
    localStorageMigrated: v.boolean(), // Track if migration from localStorage is complete
    updatedAt: v.number(),
    userId: v.string(), // Clerk user ID
  }).index("by_user", ["userId"]),
});
