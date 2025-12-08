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
import type * as costco from "../costco.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as fmp from "../fmp.js";
import type * as lib_metalParsing from "../lib/metalParsing.js";
import type * as lib_pureApiParsing from "../lib/pureApiParsing.js";
import type * as marketPrices from "../marketPrices.js";
import type * as pure from "../pure.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  costco: typeof costco;
  crons: typeof crons;
  dashboard: typeof dashboard;
  fmp: typeof fmp;
  "lib/metalParsing": typeof lib_metalParsing;
  "lib/pureApiParsing": typeof lib_pureApiParsing;
  marketPrices: typeof marketPrices;
  pure: typeof pure;
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

export declare const components: {};
