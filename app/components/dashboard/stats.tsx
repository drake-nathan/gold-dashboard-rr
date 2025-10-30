import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { StatCard } from "./stat-card";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;

interface StatsProps {
  collectPure: GetStats["collectPure"];
  goldProducts: GetStats["goldProducts"]["bestSpread"];
  lastFetch: GetStats["lastFetch"];
  marketPrices: GetStats["marketPrices"];
  silverProducts: GetStats["silverProducts"]["bestSpread"];
  totalCashbackPercentage: number;
}

export const Stats = ({
  lastFetch,
  marketPrices,
  totalCashbackPercentage,
}: StatsProps) => {
  // Find each asset in market prices
  const gold = marketPrices.find((p) => p.assetType === "gold");
  const silver = marketPrices.find((p) => p.assetType === "silver");
  const bitcoin = marketPrices.find((p) => p.assetType === "bitcoin");
  const sp500 = marketPrices.find((p) => p.assetType === "sp500");

  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
      {/* Left Side - Market Prices */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        {gold ?
          <StatCard
            label="Gold (XAU)"
            percentChange={gold.percentChange}
            value={`$${gold.currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}`}
            valueColor="text-xl font-bold text-yellow-600 dark:text-yellow-400"
            variant="market"
          />
        : null}

        {silver ?
          <StatCard
            label="Silver (XAG)"
            percentChange={silver.percentChange}
            value={`$${silver.currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}`}
            valueColor="text-xl font-bold text-slate-500 dark:text-slate-400"
            variant="market"
          />
        : null}

        {bitcoin ?
          <StatCard
            label="Bitcoin (BTC)"
            percentChange={bitcoin.percentChange}
            value={`$${bitcoin.currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 0,
              minimumFractionDigits: 0,
            })}`}
            valueColor="text-xl font-bold text-orange-600 dark:text-orange-400"
            variant="market"
          />
        : null}

        {sp500 ?
          <StatCard
            label="S&P 500"
            percentChange={sp500.percentChange}
            value={`$${sp500.currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}`}
            valueColor="text-xl font-bold text-blue-600 dark:text-blue-400"
            variant="market"
          />
        : null}
      </div>

      {/* Right Side - Cashback and Timestamp */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <StatCard
          label="Total Cashback"
          value={`${totalCashbackPercentage.toFixed(1)}%`}
          valueColor="text-2xl font-bold text-green-600 dark:text-green-400"
          variant="info"
        />

        {lastFetch ?
          <StatCard
            label="Last Update"
            value={new Date(lastFetch.timestamp).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
            valueColor="text-lg font-bold"
            variant="info"
          />
        : null}
      </div>
    </div>
  );
};
