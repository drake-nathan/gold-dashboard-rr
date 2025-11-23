/**
 * Migrations History
 *
 * This file tracks completed migrations for the gold-dashboard project.
 */

/**
 * COMPLETED: 2025-01-XX - Remove Pure bid prices from Costco products
 *
 * Migration successfully removed the deprecated pureBidPrice, pureBidPricePerOz,
 * and pureBidUpdated fields from all 22 Costco products.
 *
 * These fields are no longer used - we now JOIN with the pureProducts table
 * to get fresh bid prices instead of storing stale copies.
 *
 * Results:
 * - Total products processed: 22
 * - Products updated: 22
 * - Duration: <1s
 */
