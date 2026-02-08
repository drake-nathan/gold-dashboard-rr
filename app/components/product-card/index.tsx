import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { BellPlus, ExternalLink } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercentage, formatWeight } from "@/utils/format";
import { formatRelativeTime } from "@/utils/format-time";
import { calculateProductMetrics } from "@/utils/product-calculations";
import { generatePureProductUrl } from "@/utils/pure-url";

import type { CalculatorSettings } from "../calculator-settings";
import type { ProductCardData } from "../dashboard";

import { PriceRow } from "./price-row";

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

  // Generate Collect Pure URL if we have the SKU
  const collectPureUrl =
    product.pureProductSku ?
      generatePureProductUrl(product.pureProductSku)
    : `https://www.collectpure.com/search?q=${encodeURIComponent(product.name)}`;

  const alertLink = `/alerts?${new URLSearchParams({
    name: `${product.name} in-stock`,
    productId: product.productId,
    triggerOn: "in_stock",
    type: "sku",
  }).toString()}`;

  return (
    <Card className="flex h-full flex-col gap-3">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-h-24 flex-col justify-between">
            <CardTitle className="line-clamp-2 text-base leading-tight">
              {product.name}
            </CardTitle>
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full">
                <Badge
                  variant={product.currentInStock ? "default" : "secondary"}
                >
                  {product.currentInStock ? "In Stock" : "Out of Stock"}
                </Badge>
                <Badge
                  variant={product.metalType === "gold" ? "gold" : "silver"}
                >
                  {product.metalType.charAt(0).toUpperCase() +
                    product.metalType.slice(1)}
                </Badge>
                {product.metalWeight ?
                  <span className="text-xs text-muted-foreground">
                    {formatWeight(product.metalWeight)}
                  </span>
                : null}
              </div>
              {!product.currentInStock && product.lastInStockAt ?
                <span className="text-xs text-muted-foreground italic">
                  Last in stock {formatRelativeTime(product.lastInStockAt)}
                </span>
              : null}
            </div>
          </div>
          {product.thumbnail ?
            <img
              alt={product.name}
              className="size-24 shrink-0 rounded object-cover"
              src={product.thumbnail}
            />
          : null}
        </div>

        <div className="mt-3">
          <Button asChild className="w-full" size="sm" variant="secondary">
            <Link to={alertLink}>
              <BellPlus className="size-4" />
              Create In-Stock Alert
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 text-sm">
        {/* Pricing Breakdown */}
        <div className="space-y-1.5 rounded-lg border bg-muted/50 p-3">
          {/* === SECTION 1: Purchase Details === */}
          <PriceRow
            label="Costco Price:"
            tooltip="Purchase price from Costco per unit"
            value={
              <>
                {calc.aboveSpotPercentage !== null && (
                  <span className="mr-1.5 text-xs font-light text-muted-foreground">
                    {formatPercentage(calc.aboveSpotPercentage)} above spot
                  </span>
                )}
                -{formatCurrency(calc.unitCostcoPrice)}
                {calc.quantity > 1 && (
                  <span className="mt-0.5 block text-right text-xs font-light text-muted-foreground italic">
                    {calc.quantity}x = {formatCurrency(calc.costcoPrice)}
                  </span>
                )}
              </>
            }
          />

          {calc.pureBidPrice !== null ?
            <>
              <div className="my-1.5 border-t border-border/50" />
              <PriceRow
                label="Pure Bid:"
                labelClassName="text-xs text-muted-foreground"
                tooltip="Amount Collect Pure will pay per unit"
                value={
                  <>
                    +{formatCurrency(calc.unitPureBidPrice ?? 0)}
                    {calc.quantity > 1 && (
                      <span className="mt-0.5 block text-right text-xs font-light text-muted-foreground italic">
                        {calc.quantity}x = {formatCurrency(calc.pureBidPrice)}
                      </span>
                    )}
                  </>
                }
                valueClassName="text-xs font-medium"
              />
              <PriceRow
                label={`Pure Fee (${formatPercentage(calc.pureFeePercentage)}):`}
                labelClassName="text-xs text-muted-foreground"
                tooltip="Fee deducted when selling to Collect Pure (total for all units)"
                value={`-${formatCurrency(calc.pureFee)}`}
                valueClassName="text-xs font-medium"
              />
              {calc.purePayout !== null && (
                <PriceRow
                  label="Pure Payout:"
                  tooltip="Total cash you'll receive from Collect Pure after fees (all units)"
                  value={`+${formatCurrency(calc.purePayout)}`}
                  valueClassName="font-semibold"
                />
              )}
              {calc.initialCashLoss !== null && (
                <PriceRow
                  label="Initial Cash Loss:"
                  labelClassName="text-xs text-muted-foreground"
                  tooltip="Money you're down immediately after buying and selling (before any cashback)"
                  value={`-${formatCurrency(calc.initialCashLoss)}`}
                  valueClassName="text-xs font-medium text-amber-600 dark:text-amber-400"
                />
              )}
            </>
          : <div className="text-center text-xs text-muted-foreground italic">
              No Pure bid available
            </div>
          }

          {/* === SECTION 3: Cashback or Points === */}
          {
            calculatorSettings.creditCard.cardType === "travel" ?
              // Travel points display
              calc.pointsEarned > 0 && (
                <>
                  <div className="my-1.5 border-t border-border/50" />
                  {
                    calc.hasSignupBonus && calc.signupBonusPoints > 0 ?
                      // Show breakdown when SUB is active
                      <>
                        <PriceRow
                          label="Base Points Earned:"
                          labelClassName="text-xs text-muted-foreground"
                          tooltip={`${calculatorSettings.creditCard.pointsPerDollar}x base points on ${formatCurrency(calc.costcoPrice)}`}
                          value={calc.basePointsEarned.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                          valueClassName="text-xs font-medium"
                        />
                        <PriceRow
                          label="SUB Bonus Points:"
                          labelClassName="text-xs font-medium text-primary"
                          tooltip={`Proportional signup bonus points for this purchase (${calculatorSettings.creditCard.signupBonus?.pointsBonus.toLocaleString("en-US")} points ÷ ${formatCurrency(calculatorSettings.creditCard.signupBonus?.spendRequirement ?? 0)} spend × ${formatCurrency(calc.costcoPrice)})`}
                          value={`+${calc.signupBonusPoints.toLocaleString(
                            "en-US",
                            {
                              maximumFractionDigits: 0,
                            },
                          )}`}
                          valueClassName="text-xs font-semibold text-primary"
                        />
                        {calc.spendProgress !== null &&
                          calc.spendProgressPercentage !== null && (
                            <PriceRow
                              label="SUB Progress:"
                              labelClassName="text-xs text-muted-foreground italic"
                              tooltip={`This purchase is ${formatCurrency(calc.spendProgress)} toward your SUB spend requirement`}
                              value={`${formatPercentage(calc.spendProgressPercentage)} of SUB`}
                              valueClassName="text-xs italic text-muted-foreground"
                            />
                          )}
                        <PriceRow
                          label="Total Points:"
                          tooltip="Total points earned (base + SUB bonus)"
                          value={calc.pointsEarned.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                          valueClassName="font-semibold"
                        />
                      </>
                      // Show simple total when no SUB
                    : <PriceRow
                        label="Points Earned:"
                        labelClassName="text-xs text-muted-foreground"
                        tooltip={`${calculatorSettings.creditCard.pointsPerDollar}x points on ${formatCurrency(calc.costcoPrice)}`}
                        value={calc.pointsEarned.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                        valueClassName="text-xs font-medium"
                      />

                  }
                  {calc.netCostAfterCostcoCashback !== null && (
                    <PriceRow
                      label="Net Cost (after Costco 2%):"
                      labelClassName="text-xs text-muted-foreground"
                      tooltip="Out-of-pocket cost after selling to Pure and receiving Costco Executive cashback"
                      value={
                        calc.netCostAfterCostcoCashback >= 0 ?
                          `-${formatCurrency(calc.netCostAfterCostcoCashback)}`
                        : `+${formatCurrency(Math.abs(calc.netCostAfterCostcoCashback))}`
                      }
                      valueClassName="text-xs font-medium"
                    />
                  )}
                  {calc.pricePerPoint !== null && (
                    <PriceRow
                      label="Price per Point:"
                      tooltip="Effective cost per point earned (net cost / points earned)"
                      value={`${(calc.pricePerPoint * 100).toFixed(2)}¢`}
                      valueClassName="font-semibold"
                    />
                  )}
                </>
              )
              // Cashback display
            : calc.totalCashback > 0 && (
                <>
                  <div className="my-1.5 border-t border-border/50" />
                  {
                    calc.hasSignupBonus && calc.signupBonusCashback > 0 ?
                      // Show breakdown when SUB is active
                      <>
                        {calc.costcoCashback > 0 && (
                          <PriceRow
                            label={`Costco Cashback (${formatPercentage(calc.costcoCashbackPercentage)}):`}
                            labelClassName="text-xs text-muted-foreground"
                            tooltip="Costco Executive membership 2% cashback"
                            value={`+${formatCurrency(calc.costcoCashback)}`}
                            valueClassName="text-xs font-medium"
                          />
                        )}
                        <PriceRow
                          label={`Card Cashback (${formatPercentage(calc.creditCardCashbackPercentage)}):`}
                          labelClassName="text-xs text-muted-foreground"
                          tooltip="Base credit card cashback (without SUB)"
                          value={`+${formatCurrency(calc.creditCardCashback)}`}
                          valueClassName="text-xs font-medium"
                        />
                        <PriceRow
                          label={`SUB Bonus (${formatPercentage(calc.signupBonusCashbackPercentage)}):`}
                          labelClassName="text-xs font-medium text-primary"
                          tooltip="Signup bonus cashback on this purchase"
                          value={`+${formatCurrency(calc.signupBonusCashback)}`}
                          valueClassName="text-xs font-semibold text-primary"
                        />
                        {calc.spendProgress !== null &&
                          calc.spendProgressPercentage !== null && (
                            <PriceRow
                              label="SUB Progress:"
                              labelClassName="text-xs text-muted-foreground italic"
                              tooltip={`This purchase is ${formatCurrency(calc.spendProgress)} toward your SUB spend requirement`}
                              value={`${formatPercentage(calc.spendProgressPercentage)} of SUB`}
                              valueClassName="text-xs italic text-muted-foreground"
                            />
                          )}
                        <PriceRow
                          label={`Total Cashback (${formatPercentage(calc.totalCashbackPercentage)}):`}
                          tooltip="Combined cashback from all sources"
                          value={`+${formatCurrency(calc.totalCashback)}`}
                          valueClassName="font-semibold"
                        />
                      </>
                      // Show combined total when no SUB
                    : <PriceRow
                        label={`Total Cashback (${formatPercentage(calc.totalCashbackPercentage)}):`}
                        labelClassName="text-xs text-muted-foreground"
                        tooltip={`Costco Executive: ${formatPercentage(calc.costcoCashbackPercentage, 1)} + Credit Card: ${formatPercentage(calc.creditCardCashbackPercentage)}`}
                        value={`+${formatCurrency(calc.totalCashback)}`}
                        valueClassName="text-xs font-medium"
                      />

                  }
                </>
              )

          }

          {/* === SECTION 4: Net Profit === */}
          {calc.netProfit !== null && (
            <>
              <div className="my-2 border-t" />
              <PriceRow
                label="Net Profit:"
                labelClassName="text-base font-semibold"
                tooltip="Final profit/loss after receiving all cashback"
                value={
                  <>
                    <span className="sr-only">
                      {calc.netProfit >= 0 ? "Profit" : "Loss"}:
                    </span>
                    {`${calc.netProfit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(calc.netProfit))}`}
                  </>
                }
                valueClassName={`text-2xl font-bold ${calc.profitColor}`}
              />
              {calc.netProfitPercentage !== null && (
                <PriceRow
                  label="Return:"
                  labelClassName="text-xs text-muted-foreground"
                  value={`${calc.netProfitPercentage >= 0 ? "+" : ""}${formatPercentage(calc.netProfitPercentage)}`}
                  valueClassName={`text-base font-bold ${calc.profitColor}`}
                />
              )}
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="mt-3 flex gap-3">
        <Button asChild className="flex-1" size="default" variant="outline">
          <a
            aria-label={`View ${product.name} on Costco`}
            href={product.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            View on Costco
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </Button>
        <Button asChild className="flex-1" size="default" variant="default">
          <a
            aria-label={
              product.pureProductSku ?
                `View ${product.pureProductName ?? product.name} on Collect Pure`
              : `Search for ${product.name} on Collect Pure`
            }
            href={collectPureUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {product.pureProductSku ? "View on Pure" : "Search on Pure"}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};
