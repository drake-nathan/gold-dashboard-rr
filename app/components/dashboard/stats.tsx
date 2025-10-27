import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

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

  const renderTrendIndicator = (percentChange: number | null) => {
    if (percentChange === null) {
      return null;
    }

    const isPositive = percentChange >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Icon className="h-3 w-3" />
        <span>{Math.abs(percentChange).toFixed(2)}%</span>
      </div>
    );
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      {/* Left Side - Market Prices */}
      <div className="flex flex-wrap gap-3">
        {gold && (
          <Card className="w-[180px] py-3">
            <CardContent className="space-y-1 p-0 px-3">
              <div className="text-xs text-muted-foreground">Gold (XAU)</div>
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                $
                {gold.currentPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
              </div>
              {renderTrendIndicator(gold.percentChange)}
            </CardContent>
          </Card>
        )}

        {silver && (
          <Card className="w-[180px] py-3">
            <CardContent className="space-y-1 p-0 px-3">
              <div className="text-xs text-muted-foreground">Silver (XAG)</div>
              <div className="text-xl font-bold text-slate-500 dark:text-slate-400">
                $
                {silver.currentPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
              </div>
              {renderTrendIndicator(silver.percentChange)}
            </CardContent>
          </Card>
        )}

        {bitcoin && (
          <Card className="w-[180px] py-3">
            <CardContent className="space-y-1 p-0 px-3">
              <div className="text-xs text-muted-foreground">Bitcoin (BTC)</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                $
                {bitcoin.currentPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                  minimumFractionDigits: 0,
                })}
              </div>
              {renderTrendIndicator(bitcoin.percentChange)}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Side - Cashback and Timestamp */}
      <div className="flex flex-wrap gap-3">
        <Card className="w-[140px] py-3">
          <CardContent className="space-y-1 p-0 px-3">
            <div className="text-xs text-muted-foreground">Total Cashback</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totalCashbackPercentage.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {lastFetch && (
          <Card className="w-[140px] py-3">
            <CardContent className="space-y-1 p-0 px-3">
              <div className="text-xs text-muted-foreground">Last Update</div>
              <div className="text-lg font-bold">
                {new Date(lastFetch.timestamp).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
