import { useIsClient } from "usehooks-ts";

import type { DashboardMarketPrice, DashboardStats } from "../types";
import { StatCard } from "./stat-card";

interface StatsProps {
  lastFetch: DashboardStats["lastFetch"];
  marketPrices: DashboardMarketPrice[];
  totalCashbackPercentage: number;
}

interface MarketAssetConfig {
  assetType: DashboardMarketPrice["assetType"];
  fractionDigits: number;
  label: string;
  valueColor: string;
}

const MARKET_ASSETS: MarketAssetConfig[] = [
  {
    assetType: "gold",
    fractionDigits: 2,
    label: "Gold (XAU)",
    valueColor: "text-xl font-bold text-yellow-600 dark:text-yellow-400",
  },
  {
    assetType: "silver",
    fractionDigits: 2,
    label: "Silver (XAG)",
    valueColor: "text-xl font-bold text-slate-500 dark:text-slate-400",
  },
  {
    assetType: "bitcoin",
    fractionDigits: 0,
    label: "Bitcoin (BTC)",
    valueColor: "text-xl font-bold text-orange-600 dark:text-orange-400",
  },
  {
    assetType: "sp500",
    fractionDigits: 2,
    label: "S&P 500",
    valueColor: "text-xl font-bold text-blue-600 dark:text-blue-400",
  },
];

const UNAVAILABLE_VALUE_CLASS = "text-xl font-bold text-muted-foreground";

export const Stats = ({ lastFetch, marketPrices, totalCashbackPercentage }: StatsProps) => {
  const isClient = useIsClient();

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-3 xl:justify-between">
      {/* Market Prices - grouped on desktop */}
      <div className="contents xl:flex xl:flex-wrap xl:gap-3">
        {MARKET_ASSETS.map((asset) => {
          const price = marketPrices.find((p) => p.assetType === asset.assetType);

          if (!price) {
            return (
              <StatCard
                key={asset.assetType}
                label={`${asset.label} (unavailable)`}
                value="—"
                valueColor={UNAVAILABLE_VALUE_CLASS}
                variant="market"
              />
            );
          }

          return (
            <StatCard
              key={asset.assetType}
              label={asset.label}
              percentChange={price.percentChange}
              value={`$${price.currentPrice.toLocaleString("en-US", {
                maximumFractionDigits: asset.fractionDigits,
                minimumFractionDigits: asset.fractionDigits,
              })}`}
              valueColor={asset.valueColor}
              variant="market"
            />
          );
        })}
      </div>

      {/* Cashback and Timestamp - grouped on desktop */}
      <div className="contents xl:flex xl:flex-wrap xl:gap-3">
        <StatCard
          label="Total Cashback"
          value={`${totalCashbackPercentage.toFixed(1)}%`}
          valueColor="text-2xl font-bold text-green-600 dark:text-green-400"
          variant="info"
        />

        <StatCard
          label="Last Update"
          value={
            isClient && lastFetch
              ? new Date(lastFetch.timestamp).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "--:--"
          }
          valueColor="text-lg font-bold"
          variant="info"
        />
      </div>
    </div>
  );
};
