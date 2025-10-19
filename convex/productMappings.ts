import { v } from "convex/values";

import { action, internalMutation, mutation, query } from "./_generated/server";

// Create a new product mapping
export const createMapping = mutation({
  args: {
    costcoProductId: v.string(),
    notes: v.optional(v.string()),
    pureSearchCriteria: v.object({
      manufacturer: v.optional(v.string()),
      material: v.string(),
      productType: v.optional(v.string()),
      purity: v.optional(v.string()),
      specificSku: v.optional(v.string()),
      weight: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Check if mapping already exists
    const existing = await ctx.db
      .query("costcoPureProductMappings")
      .withIndex("by_costco_product", (q) =>
        q.eq("costcoProductId", args.costcoProductId),
      )
      .first();

    if (existing) {
      // Update existing mapping
      await ctx.db.patch(existing._id, {
        notes: args.notes,
        pureSearchCriteria: args.pureSearchCriteria,
        updatedAt: timestamp,
      });
      return existing._id;
    }
    // Create new mapping
    return await ctx.db.insert("costcoPureProductMappings", {
      costcoProductId: args.costcoProductId,
      createdAt: timestamp,
      isActive: true,
      notes: args.notes,
      pureSearchCriteria: args.pureSearchCriteria,
      updatedAt: timestamp,
    });
  },
});

// Get all active mappings
export const getActiveMappings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("costcoPureProductMappings")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get mapping for a specific Costco product
export const getMapping = query({
  args: { costcoProductId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costcoPureProductMappings")
      .withIndex("by_costco_product", (q) =>
        q.eq("costcoProductId", args.costcoProductId),
      )
      .first();
  },
});

// Toggle mapping active status
export const toggleMapping = mutation({
  args: {
    costcoProductId: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("costcoPureProductMappings")
      .withIndex("by_costco_product", (q) =>
        q.eq("costcoProductId", args.costcoProductId),
      )
      .first();

    if (!mapping) {
      throw new Error(
        `No mapping found for Costco product ${args.costcoProductId}`,
      );
    }

    await ctx.db.patch(mapping._id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return mapping._id;
  },
});

// Bulk create initial mappings (for setup)
export const createInitialMappings = mutation({
  args: {},
  handler: async (ctx) => {
    const initialMappings = [
      // 1 oz Gold Bars
      {
        costcoProductId: "1886707", // 1 oz Gold Argor Heraeus Kinebar
        notes: "1 oz gold bar - generic matching for Argor Heraeus",
        pureSearchCriteria: {
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "1oz",
        },
      },
      {
        costcoProductId: "1943308", // 1 oz Gold Bar PAMP Suisse Lady Fortuna Veriscan
        notes: "PAMP Suisse 1 oz gold bar with Veriscan",
        pureSearchCriteria: {
          manufacturer: "PAMP Suisse",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "1oz",
        },
      },
      {
        costcoProductId: "1968751", // The Royal Mint Britannia 1 oz Gold Bar
        notes: "Royal Mint Britannia 1 oz gold bar",
        pureSearchCriteria: {
          manufacturer: "Royal Mint",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "1oz",
        },
      },
      {
        costcoProductId: "8888808", // 1 oz Gold Bar PAMP Suisse Good Luck Yellow Dragon
        notes: "PAMP Suisse themed 1 oz gold bar",
        pureSearchCriteria: {
          manufacturer: "PAMP Suisse",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "1oz",
        },
      },
      {
        costcoProductId: "1943072", // 1 oz Gold Bar PAMP Suisse Diwali Lakshmi
        notes: "PAMP Suisse themed 1 oz gold bar",
        pureSearchCriteria: {
          manufacturer: "PAMP Suisse",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "1oz",
        },
      },
      {
        costcoProductId: "1943085", // 1 oz Gold Bar Rand Refinery
        notes: "Rand Refinery 1 oz gold bar",
        pureSearchCriteria: {
          manufacturer: "Rand Refinery",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "1oz",
        },
      },

      // 100 Gram Gold Bars
      {
        costcoProductId: "1957979", // 100 Gram Gold Bar Rand Refinery
        notes: "Rand Refinery 100 gram gold bar",
        pureSearchCriteria: {
          manufacturer: "Rand Refinery",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "100g",
        },
      },
      {
        costcoProductId: "1801206", // 100 Gram Gold Bar Pamp Suisse Lady Fortuna Veriscan
        notes: "PAMP Suisse 100 gram gold bar with Veriscan",
        pureSearchCriteria: {
          manufacturer: "PAMP Suisse",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "100g",
        },
      },
      {
        costcoProductId: "1982277", // 100 Gram Royal Canadian Mint Gold Bar
        notes: "Royal Canadian Mint 100 gram gold bar",
        pureSearchCriteria: {
          manufacturer: "Royal Canadian Mint",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "100g",
        },
      },

      // Fractional Gold
      {
        costcoProductId: "1942925", // 1/2 oz Gold Bar PAMP Suisse Lady Fortuna Veriscan
        notes: "PAMP Suisse 1/2 oz gold bar",
        pureSearchCriteria: {
          manufacturer: "PAMP Suisse",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "0.5oz",
        },
      },
      {
        costcoProductId: "1811661", // 25 Gram Pamp Suisse Lady Fortuna Multigram Gold Bar
        notes: "PAMP Suisse 25 gram gold bar",
        pureSearchCriteria: {
          manufacturer: "PAMP Suisse",
          material: "Gold",
          productType: "bar",
          purity: ".9999",
          weight: "25g",
        },
      },
    ];

    const timestamp = Date.now();
    let created = 0;

    for (const mapping of initialMappings) {
      try {
        // Check if mapping already exists
        const existing = await ctx.db
          .query("costcoPureProductMappings")
          .withIndex("by_costco_product", (q) =>
            q.eq("costcoProductId", mapping.costcoProductId),
          )
          .first();

        if (existing) {
          // Update existing mapping
          await ctx.db.patch(existing._id, {
            notes: mapping.notes,
            pureSearchCriteria: mapping.pureSearchCriteria,
            updatedAt: timestamp,
          });
        } else {
          // Create new mapping
          await ctx.db.insert("costcoPureProductMappings", {
            costcoProductId: mapping.costcoProductId,
            createdAt: timestamp,
            isActive: true,
            notes: mapping.notes,
            pureSearchCriteria: mapping.pureSearchCriteria,
            updatedAt: timestamp,
          });
        }
        created++;
      } catch (error) {
        console.warn(
          `Failed to create mapping for ${mapping.costcoProductId}:`,
          error,
        );
      }
    }

    return {
      created,
      success: true,
      total: initialMappings.length,
    };
  },
});

// List all mappings with their associated Costco product info
export const listMappingsWithProducts = query({
  args: {},
  handler: async (ctx) => {
    const mappings = await ctx.db.query("costcoPureProductMappings").collect();

    const results = [];
    for (const mapping of mappings) {
      const costcoProduct = await ctx.db
        .query("costcoProducts")
        .withIndex("by_product_id", (q) =>
          q.eq("productId", mapping.costcoProductId),
        )
        .first();

      results.push({
        costcoProduct,
        mapping,
      });
    }

    return results.sort(
      (a, b) => (b.mapping.updatedAt || 0) - (a.mapping.updatedAt || 0),
    );
  },
});
