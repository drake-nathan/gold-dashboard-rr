import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/utils/format";
import { calculateProductMetrics } from "@/utils/product-calculations";

import type { CalculatorSettings } from "./calculator-settings";
import type { ProductCardData } from "./dashboard";

import { PriceRow } from "./product-card/price-row";
import { Separator } from "./ui/separator";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;

interface ProductCardProps {
  calculatorSettings: CalculatorSettings;
  marketPrices: GetStats["marketPrices"];
  product: ProductCardData;
}

export const ProductCard = ({
  calculatorSettings,
  marketPrices,
  product,
}: ProductCardProps) => {
  // Calculate all metrics using utility function
  const calc = calculateProductMetrics(
    product,
    marketPrices,
    calculatorSettings,
  );

  // Collect Pure URL (placeholder for now)
  const collectPureUrl = `https://collectpure.com/search?q=${encodeURIComponent(
    product.name,
  )}`;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-h-[3rem] flex-1">
            <CardTitle className="line-clamp-2 text-base leading-tight">
              {product.name}
            </CardTitle>
            {product.brand ?
              <CardDescription className="mt-1 line-clamp-1">
                {product.brand}
              </CardDescription>
            : null}
          </div>
          {product.thumbnail ?
            <img
              alt={product.name}
              className="h-16 w-16 shrink-0 rounded object-cover"
              src={product.thumbnail}
            />
          : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3 text-sm">
        <div className="flex min-h-[2rem] items-center gap-2">
          <Badge variant={product.currentInStock ? "default" : "secondary"}>
            {product.currentInStock ? "In Stock" : "Out of Stock"}
          </Badge>
          <Badge variant={product.metalType === "gold" ? "gold" : "silver"}>
            {product.metalType.charAt(0).toUpperCase() +
              product.metalType.slice(1)}
          </Badge>
        </div>

        {/* Metal Weight */}
        <div className="min-h-[1.5rem]">
          {product.metalWeight ?
            <div className="text-muted-foreground">
              Weight: {product.metalWeight}
            </div>
          : null}
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-1.5 rounded-lg border bg-muted/50 p-3">
          {/* Costco Price with Above Spot Badge */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Costco Price:</span>
            <div className="flex items-center gap-2">
              {calc.aboveSpotPercentage !== null && (
                <Badge variant="destructive">
                  {formatPercentage(calc.aboveSpotPercentage)} Above Spot
                </Badge>
              )}
              <span className="font-medium">
                -{formatCurrency(calc.costcoPrice)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Pure Bid Section */}
          {calc.pureBidPrice !== null ?
            <>
              <PriceRow
                label="Pure Bid Price:"
                value={`+${formatCurrency(calc.pureBidPrice)}`}
              />
              <PriceRow
                label="Pure Fee (0.75%):"
                value={`-${formatCurrency(calc.pureFee)}`}
              />
              <PriceRow
                label="Net from Sale:"
                value={
                  calc.netFromSale !== null ?
                    formatCurrency(calc.netFromSale)
                  : "—"
                }
                valueClassName="font-semibold"
              />
            </>
          : <div className="text-center text-muted-foreground">
              No Pure bid available
            </div>
          }

          <Separator />

          {/* Initial Cash Loss */}
          {calc.initialCashLoss !== null && (
            <PriceRow
              label="Initial Cash Loss:"
              value={`-${formatCurrency(calc.initialCashLoss)}`}
              valueClassName="font-bold text-red-600 dark:text-red-400"
            />
          )}

          <Separator />

          {/* Cashback Section */}
          {calc.costcoCashbackPercentage > 0 && (
            <PriceRow
              label={`Costco Cashback (${formatPercentage(calc.costcoCashbackPercentage, 1)}):`}
              value={`+${formatCurrency(calc.costcoCashback)}`}
            />
          )}
          {calc.creditCardCashbackPercentage > 0 && (
            <PriceRow
              label={`CC Cashback (${formatPercentage(calc.creditCardCashbackPercentage)}):`}
              value={`+${formatCurrency(calc.creditCardCashback)}`}
            />
          )}
          {calc.totalCashback > 0 && (
            <PriceRow
              label="Total Cashback:"
              value={`+${formatCurrency(calc.totalCashback)}`}
              valueClassName="font-semibold"
            />
          )}

          <Separator />

          {/* Net Profit */}
          {calc.netProfit !== null && (
            <>
              <PriceRow
                label="Net Profit:"
                value={`${calc.netProfit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(calc.netProfit))}`}
                valueClassName={`font-bold ${calc.profitColor}`}
              />
              {calc.netProfitPercentage !== null && (
                <PriceRow
                  label="Profit %:"
                  value={`${calc.netProfitPercentage >= 0 ? "+" : ""}${formatPercentage(calc.netProfitPercentage)}`}
                  valueClassName={`font-bold ${calc.profitColor}`}
                />
              )}
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-around gap-1.5">
        <Button asChild size="sm" variant="ghost">
          <a href={product.url} rel="noopener noreferrer" target="_blank">
            Costco <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={collectPureUrl} rel="noopener noreferrer" target="_blank">
            Pure <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};
