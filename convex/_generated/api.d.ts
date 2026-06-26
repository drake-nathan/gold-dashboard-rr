/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as admin_access from "../admin/access.js";
import type * as admin_actions from "../admin/actions.js";
import type * as admin_catalog from "../admin/catalog.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_pure from "../admin/pure.js";
import type * as admin_review from "../admin/review.js";
import type * as alerts from "../alerts.js";
import type * as alerts_batches from "../alerts/batches.js";
import type * as alerts_core from "../alerts/core.js";
import type * as alerts_evaluation from "../alerts/evaluation.js";
import type * as alerts_weightGroups from "../alerts/weightGroups.js";
import type * as costco from "../costco.js";
import type * as costco_api from "../costco/api.js";
import type * as costco_brightParsing from "../costco/brightParsing.js";
import type * as costco_matching from "../costco/matching.js";
import type * as costco_productState from "../costco/productState.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as digests from "../digests.js";
import type * as feedback from "../feedback.js";
import type * as fmp from "../fmp.js";
import type * as http from "../http.js";
import type * as lib_authIdentity from "../lib/authIdentity.js";
import type * as lib_metalParsing from "../lib/metalParsing.js";
import type * as lib_productMatching from "../lib/productMatching.js";
import type * as lib_pureApiParsing from "../lib/pureApiParsing.js";
import type * as lib_queries from "../lib/queries.js";
import type * as marketPrices from "../marketPrices.js";
import type * as migrations from "../migrations.js";
import type * as posthog from "../posthog.js";
import type * as pure from "../pure.js";
import type * as snapshotExport from "../snapshotExport.js";
import type * as stripe from "../stripe.js";
import type * as stripeUtils from "../stripeUtils.js";
import type * as subscriptionEntitlements from "../subscriptionEntitlements.js";
import type * as userCards from "../userCards.js";
import type * as userSettings from "../userSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "admin/access": typeof admin_access;
  "admin/actions": typeof admin_actions;
  "admin/catalog": typeof admin_catalog;
  "admin/mutations": typeof admin_mutations;
  "admin/pure": typeof admin_pure;
  "admin/review": typeof admin_review;
  alerts: typeof alerts;
  "alerts/batches": typeof alerts_batches;
  "alerts/core": typeof alerts_core;
  "alerts/evaluation": typeof alerts_evaluation;
  "alerts/weightGroups": typeof alerts_weightGroups;
  costco: typeof costco;
  "costco/api": typeof costco_api;
  "costco/brightParsing": typeof costco_brightParsing;
  "costco/matching": typeof costco_matching;
  "costco/productState": typeof costco_productState;
  crons: typeof crons;
  dashboard: typeof dashboard;
  digests: typeof digests;
  feedback: typeof feedback;
  fmp: typeof fmp;
  http: typeof http;
  "lib/authIdentity": typeof lib_authIdentity;
  "lib/metalParsing": typeof lib_metalParsing;
  "lib/productMatching": typeof lib_productMatching;
  "lib/pureApiParsing": typeof lib_pureApiParsing;
  "lib/queries": typeof lib_queries;
  marketPrices: typeof marketPrices;
  migrations: typeof migrations;
  posthog: typeof posthog;
  pure: typeof pure;
  snapshotExport: typeof snapshotExport;
  stripe: typeof stripe;
  stripeUtils: typeof stripeUtils;
  subscriptionEntitlements: typeof subscriptionEntitlements;
  userCards: typeof userCards;
  userSettings: typeof userSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
};
