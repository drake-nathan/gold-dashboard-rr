import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/utils/format";
import { calculateProductMetrics } from "@/utils/product-calculations";

import type { CalculatorSettings } from "./calculator-settings";
import type { ProductCardData } from "./dashboard";

import { PriceRow } from "./product-card/price-row";

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
    <Card className="flex h-full flex-col gap-5">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col justify-between gap-5">
            <CardTitle className="line-clamp-2 text-base leading-tight">
              {product.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={product.currentInStock ? "default" : "secondary"}>
                {product.currentInStock ? "In Stock" : "Out of Stock"}
              </Badge>
              <Badge variant={product.metalType === "gold" ? "gold" : "silver"}>
                {product.metalType.charAt(0).toUpperCase() +
                  product.metalType.slice(1)}
              </Badge>
              {product.metalWeight ?
                <span className="text-xs text-muted-foreground">
                  {product.metalWeight}
                </span>
              : null}
            </div>
          </div>
          {product.thumbnail ?
            <img
              alt={product.name}
              className="h-20 w-20 shrink-0 rounded object-cover"
              src={product.thumbnail}
            />
          : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2.5 text-sm">
        {/* Pricing Breakdown */}
        <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
          {/* === SECTION 1: Purchase Details === */}
          <PriceRow
            label="Costco Price:"
            tooltip="Purchase price from Costco"
            value={
              <>
                {calc.aboveSpotPercentage !== null && (
                  <span className="mr-2 text-xs text-muted-foreground">
                    {formatPercentage(calc.aboveSpotPercentage)} above spot
                  </span>
                )}
                -{formatCurrency(calc.costcoPrice)}
              </>
            }
          />
          {calc.initialCashLoss !== null && (
            <PriceRow
              label="Initial Cash Loss:"
              labelClassName="text-xs text-muted-foreground"
              tooltip="Money you're down immediately after buying and selling (before any cashback)"
              value={`-${formatCurrency(calc.initialCashLoss)}`}
              valueClassName="text-xs font-medium text-red-600 dark:text-red-400"
            />
          )}

          {calc.pureBidPrice !== null ?
            <>
              <div className="my-1.5 border-t border-border/50" />
              <PriceRow
                label="Pure Bid:"
                tooltip="Amount Collect Pure will pay for this item"
                value={`+${formatCurrency(calc.pureBidPrice)}`}
              />
              <PriceRow
                label="Pure Fee (0.75%):"
                labelClassName="text-xs text-muted-foreground"
                tooltip="Fee deducted when selling to Collect Pure"
                value={`-${formatCurrency(calc.pureFee)}`}
                valueClassName="text-xs font-medium"
              />
            </>
          : <div className="text-center text-xs text-muted-foreground italic">
              No Pure bid available
            </div>
          }

          {/* === SECTION 2: Cashback (if any) === */}
          {calc.totalCashback > 0 && (
            <>
              <div className="my-1.5 border-t border-border/50" />
              {calc.costcoCashbackPercentage > 0 && (
                <PriceRow
                  label={`Costco (${formatPercentage(calc.costcoCashbackPercentage, 1)}):`}
                  labelClassName="text-xs text-muted-foreground"
                  tooltip="2% cashback from Costco Executive membership (paid annually)"
                  value={`+${formatCurrency(calc.costcoCashback)}`}
                  valueClassName="text-xs font-medium"
                />
              )}
              {calc.creditCardCashbackPercentage > 0 && (
                <PriceRow
                  label={`CC (${formatPercentage(calc.creditCardCashbackPercentage)}):`}
                  labelClassName="text-xs text-muted-foreground"
                  tooltip="Credit card cashback/points (paid monthly or as points)"
                  value={`+${formatCurrency(calc.creditCardCashback)}`}
                  valueClassName="text-xs font-medium"
                />
              )}
            </>
          )}

          {/* === SECTION 3: Net Profit === */}
          {calc.netProfit !== null && (
            <>
              <div className="my-2 border-t" />
              <PriceRow
                label="Net Profit:"
                labelClassName="text-sm font-semibold"
                tooltip="Final profit/loss after receiving all cashback"
                value={`${calc.netProfit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(calc.netProfit))}`}
                valueClassName={`text-lg font-bold ${calc.profitColor}`}
              />
              {calc.netProfitPercentage !== null && (
                <PriceRow
                  label="Return:"
                  labelClassName="text-xs text-muted-foreground"
                  value={`${calc.netProfitPercentage >= 0 ? "+" : ""}${formatPercentage(calc.netProfitPercentage)}`}
                  valueClassName={`text-sm font-semibold ${calc.profitColor}`}
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
