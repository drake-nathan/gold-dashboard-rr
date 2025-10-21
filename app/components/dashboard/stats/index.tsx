import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;

interface StatsProps {
  collectPure: GetStats["collectPure"];
  goldProducts: GetStats["goldProducts"]["bestSpread"];
  lastFetch: GetStats["lastFetch"];
  silverProducts: GetStats["silverProducts"]["bestSpread"];
  totalCashbackPercentage: number;
}

export const Stats = ({
  collectPure,
  goldProducts,
  lastFetch,
  silverProducts,
  totalCashbackPercentage,
}: StatsProps) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-3">
        <div className="w-[140px] rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Total Products</div>
          <div className="text-2xl font-bold">
            {goldProducts.length + silverProducts.length}
          </div>
        </div>

        <div className="w-[140px] rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Gold</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {goldProducts.length}
          </div>
        </div>

        <div className="w-[140px] rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Silver</div>
          <div className="text-2xl font-bold text-slate-500 dark:text-slate-400">
            {silverProducts.length}
          </div>
        </div>

        {collectPure.gold ?
          <div className="w-[140px] rounded-lg border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Gold Spot</div>
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              $
              {collectPure.gold.spotPrice.toLocaleString(undefined, {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0,
              })}
            </div>
          </div>
        : null}

        {collectPure.silver ?
          <div className="w-[140px] rounded-lg border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Silver Spot</div>
            <div className="text-lg font-bold text-slate-500 dark:text-slate-400">
              $
              {collectPure.silver.spotPrice.toLocaleString(undefined, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        : null}

        <div className="w-[140px] rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Total Cashback</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalCashbackPercentage.toFixed(1)}%
          </div>
        </div>

        {lastFetch ?
          <div className="w-[140px] rounded-lg border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Last Update</div>
            <div className="text-lg font-bold">
              {new Date(lastFetch.timestamp).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
        : null}
      </div>
    </div>
  );
};
