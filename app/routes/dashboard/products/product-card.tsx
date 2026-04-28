import { BellPlus, ExternalLink } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { Link } from "react-router";
import { useIsClient } from "usehooks-ts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FEATURE_FLAGS, useFeatureFlag } from "@/lib/feature-flags";
import { formatCurrency, formatPercentage, formatWeight } from "@/utils/format";
import { formatRelativeTime } from "@/utils/format-time";
import { generatePureProductUrl } from "@/utils/pure-url";

import {
  calculateProductMetrics,
  type ProductCalculations,
} from "../calculator/product-calculations";
import type { CalculatorSettings } from "../calculator/types";
import type { DashboardMarketPrice, ProductCardData } from "../types";
import { PriceRow } from "./price-row";
import {
  getInitialCashPositionDisplay,
  getPointEconomicsDisplay,
  getPostCashbackCashPositionDisplay,
} from "./product-card-metric-copy";

interface ProductCardProps {
  calculations?: ProductCalculations;
  calculatorSettings: CalculatorSettings;
  marketPrices: DashboardMarketPrice[];
  product: ProductCardData;
}

export const ProductCard = ({
  calculations,
  calculatorSettings,
  marketPrices,
  product,
}: ProductCardProps) => {
  const isClient = useIsClient();
  const posthog = usePostHog();
  const alertsEnabled = useFeatureFlag(FEATURE_FLAGS.ALERTS_BETA);

  // Calculate all metrics using utility function
  const calc = calculations ?? calculateProductMetrics(product, marketPrices, calculatorSettings);
  const initialCashPosition =
    calc.initialCashLoss !== null ? getInitialCashPositionDisplay(calc.initialCashLoss) : null;
  const postCashbackCashPosition =
    calc.netCostAfterCostcoCashback !== null
      ? getPostCashbackCashPositionDisplay(
          calc.netCostAfterCostcoCashback,
          calculatorSettings.costcoMembershipEnabled,
        )
      : null;
  const pointEconomics =
    calc.pricePerPoint !== null ? getPointEconomicsDisplay(calc.pricePerPoint) : null;

  // Generate Collect Pure URL if we have the SKU
  const collectPureUrl = product.pureProductSku
    ? generatePureProductUrl(product.pureProductSku)
    : `https://www.collectpure.com/search?q=${encodeURIComponent(product.name)}`;

  const alertLink = `/alerts?${new URLSearchParams({
    name: `${product.name} in-stock`,
    productId: product.productId,
    triggerOn: "in_stock",
    type: "sku",
  }).toString()}`;

  const baseProductProperties = {
    current_in_stock: product.currentInStock,
    current_price: product.currentPrice,
    metal_type: product.metalType,
    product_id: product.productId,
    product_name: product.name,
    pure_product_sku: product.pureProductSku ?? null,
    pure_spread_percentage: product.pureSpreadPercentage ?? null,
    source: "dashboard_product_card",
  };

  return (
    <Card className="flex h-full flex-col gap-3">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-h-24 flex-col justify-between">
            <CardTitle className="line-clamp-2 text-base leading-tight">{product.name}</CardTitle>
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full">
                <Badge variant={product.currentInStock ? "default" : "secondary"}>
                  {product.currentInStock ? "In Stock" : "Out of Stock"}
                </Badge>
                <Badge variant={product.metalType === "gold" ? "gold" : "silver"}>
                  {product.metalType.charAt(0).toUpperCase() + product.metalType.slice(1)}
                </Badge>
                {product.metalWeight ? (
                  <span className="text-xs text-muted-foreground">
                    {formatWeight(product.metalWeight)}
                  </span>
                ) : null}
              </div>
              {!product.currentInStock && product.lastInStockAt && isClient ? (
                <span className="text-xs text-muted-foreground italic">
                  Last in stock {formatRelativeTime(product.lastInStockAt)}
                </span>
              ) : null}
            </div>
          </div>
          {product.thumbnail ? (
            <img
              alt={product.name}
              className="size-24 shrink-0 rounded object-cover"
              src={product.thumbnail}
            />
          ) : null}
        </div>

        {alertsEnabled ? (
          <div className="mt-3">
            <Button asChild className="w-full" size="sm" variant="outline">
              <Link
                onClick={() => {
                  posthog.capture("alert_cta_clicked", baseProductProperties);
                }}
                to={alertLink}
              >
                <BellPlus className="size-4" />
                Create In-Stock Alert
              </Link>
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 space-y-2 text-sm">
        {/* Pricing Breakdown */}
        <div className="space-y-1.5 rounded-lg border bg-muted/50 p-3">
          {/* === SECTION 1: Purchase Details === */}
          <PriceRow
            label="Costco price:"
            tooltip="Your buy price at Costco before any resale, cashback, or points."
            value={
              <>
                {calc.aboveSpotPercentage !== null && (
                  <span className="mr-1.5 text-xs font-light text-muted-foreground">
                    {formatPercentage(calc.aboveSpotPercentage)} markup
                  </span>
                )}
                {formatCurrency(calc.unitCostcoPrice)}
                {calc.quantity > 1 && (
                  <span className="mt-0.5 block text-right text-xs font-light text-muted-foreground italic">
                    {calc.quantity}x = {formatCurrency(calc.costcoPrice)}
                  </span>
                )}
              </>
            }
          />

          {calc.pureBidPrice !== null ? (
            <>
              <div className="my-1.5 border-t border-border/50" />
              <PriceRow
                label="Pure bid:"
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
                label={`Pure fee (${formatPercentage(calc.pureFeePercentage)}):`}
                labelClassName="text-xs text-muted-foreground"
                tooltip="Fee deducted when selling to Collect Pure (total for all units)"
                value={`-${formatCurrency(calc.pureFee)}`}
                valueClassName="text-xs font-medium"
              />
              {calc.purePayout !== null && (
                <PriceRow
                  label="Pure payout:"
                  tooltip="Total cash you'll receive from Collect Pure after fees (all units)"
                  value={`+${formatCurrency(calc.purePayout)}`}
                  valueClassName="font-semibold"
                />
              )}
              {initialCashPosition && (
                <PriceRow
                  label={initialCashPosition.label}
                  labelClassName="text-xs text-muted-foreground"
                  tooltip={initialCashPosition.tooltip}
                  value={initialCashPosition.value}
                  valueClassName={`text-xs font-medium ${
                    initialCashPosition.isGain
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                />
              )}
            </>
          ) : (
            <div className="text-center text-xs text-muted-foreground italic">
              No Pure bid available
            </div>
          )}

          {/* === SECTION 3: Cashback or Points === */}
          {calculatorSettings.creditCard.cardType === "travel"
            ? // Travel points display
              calc.pointsEarned > 0 && (
                <>
                  <div className="my-1.5 border-t border-border/50" />
                  {calc.hasSignupBonus && calc.signupBonusPoints > 0 ? (
                    // Show breakdown when SUB is active
                    <>
                      <PriceRow
                        label="Base points earned:"
                        labelClassName="text-xs text-muted-foreground"
                        tooltip={`${calculatorSettings.creditCard.pointsPerDollar}x base points on ${formatCurrency(calc.costcoPrice)}`}
                        value={calc.basePointsEarned.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                        valueClassName="text-xs font-medium"
                      />
                      <PriceRow
                        label="SUB bonus points:"
                        labelClassName="text-xs font-medium text-primary"
                        tooltip={`Proportional signup bonus points for this purchase (${calculatorSettings.creditCard.signupBonus?.pointsBonus.toLocaleString("en-US")} points ÷ ${formatCurrency(calculatorSettings.creditCard.signupBonus?.spendRequirement ?? 0)} spend × ${formatCurrency(calc.costcoPrice)})`}
                        value={`+${calc.signupBonusPoints.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}`}
                        valueClassName="text-xs font-semibold text-primary"
                      />
                      {calc.spendProgress !== null && calc.spendProgressPercentage !== null && (
                        <PriceRow
                          label="SUB progress:"
                          labelClassName="text-xs text-muted-foreground italic"
                          tooltip={`This purchase is ${formatCurrency(calc.spendProgress)} toward your SUB spend requirement`}
                          value={`${formatPercentage(calc.spendProgressPercentage)} of SUB`}
                          valueClassName="text-xs italic text-muted-foreground"
                        />
                      )}
                      <PriceRow
                        label="Total points:"
                        tooltip="Total points earned (base + SUB bonus)"
                        value={calc.pointsEarned.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                        valueClassName="font-semibold"
                      />
                    </>
                  ) : (
                    // Show simple total when no SUB
                    <PriceRow
                      label="Points earned:"
                      labelClassName="text-xs text-muted-foreground"
                      tooltip={`${calculatorSettings.creditCard.pointsPerDollar}x points on ${formatCurrency(calc.costcoPrice)}`}
                      value={calc.pointsEarned.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                      valueClassName="text-xs font-medium"
                    />
                  )}
                  {postCashbackCashPosition && (
                    <PriceRow
                      label={postCashbackCashPosition.label}
                      labelClassName="text-xs text-muted-foreground"
                      tooltip={postCashbackCashPosition.tooltip}
                      value={postCashbackCashPosition.value}
                      valueClassName={`text-xs font-medium ${
                        postCashbackCashPosition.isGain ? "text-green-600 dark:text-green-400" : ""
                      }`}
                    />
                  )}
                  {pointEconomics && (
                    <PriceRow
                      label={pointEconomics.label}
                      tooltip={pointEconomics.tooltip}
                      value={pointEconomics.value}
                      valueClassName={`font-semibold ${
                        pointEconomics.isBeingPaid ? "text-green-600 dark:text-green-400" : ""
                      }`}
                    />
                  )}
                </>
              )
            : // Cashback display
              calc.totalCashback > 0 && (
                <>
                  <div className="my-1.5 border-t border-border/50" />
                  {calc.hasSignupBonus && calc.signupBonusCashback > 0 ? (
                    // Show breakdown when SUB is active
                    <>
                      {calc.costcoCashback > 0 && (
                        <PriceRow
                          label={`Costco cashback (${formatPercentage(calc.costcoCashbackPercentage)}):`}
                          labelClassName="text-xs text-muted-foreground"
                          tooltip="Costco Executive membership 2% cashback"
                          value={`+${formatCurrency(calc.costcoCashback)}`}
                          valueClassName="text-xs font-medium"
                        />
                      )}
                      <PriceRow
                        label={`Card cashback (${formatPercentage(calc.creditCardCashbackPercentage)}):`}
                        labelClassName="text-xs text-muted-foreground"
                        tooltip="Base credit card cashback (without SUB)"
                        value={`+${formatCurrency(calc.creditCardCashback)}`}
                        valueClassName="text-xs font-medium"
                      />
                      <PriceRow
                        label={`SUB bonus (${formatPercentage(calc.signupBonusCashbackPercentage)}):`}
                        labelClassName="text-xs font-medium text-primary"
                        tooltip="Signup bonus cashback on this purchase"
                        value={`+${formatCurrency(calc.signupBonusCashback)}`}
                        valueClassName="text-xs font-semibold text-primary"
                      />
                      {calc.spendProgress !== null && calc.spendProgressPercentage !== null && (
                        <PriceRow
                          label="SUB progress:"
                          labelClassName="text-xs text-muted-foreground italic"
                          tooltip={`This purchase is ${formatCurrency(calc.spendProgress)} toward your SUB spend requirement`}
                          value={`${formatPercentage(calc.spendProgressPercentage)} of SUB`}
                          valueClassName="text-xs italic text-muted-foreground"
                        />
                      )}
                      <PriceRow
                        label={`Total cashback (${formatPercentage(calc.totalCashbackPercentage)}):`}
                        tooltip="Combined cashback from all sources"
                        value={`+${formatCurrency(calc.totalCashback)}`}
                        valueClassName="font-semibold"
                      />
                    </>
                  ) : (
                    // Show combined total when no SUB
                    <PriceRow
                      label={`Total cashback (${formatPercentage(calc.totalCashbackPercentage)}):`}
                      labelClassName="text-xs text-muted-foreground"
                      tooltip={`Costco Executive: ${formatPercentage(calc.costcoCashbackPercentage, 1)} + Credit Card: ${formatPercentage(calc.creditCardCashbackPercentage)}`}
                      value={`+${formatCurrency(calc.totalCashback)}`}
                      valueClassName="text-xs font-medium"
                    />
                  )}
                </>
              )}

          {/* === SECTION 4: Net Profit === */}
          {calc.netProfit !== null && (
            <>
              <div className="my-2 border-t" />
              <PriceRow
                label="Net profit:"
                labelClassName="text-base font-semibold"
                tooltip="Final profit or loss after the Pure sale and all cashback or point value included in your settings."
                value={
                  <>
                    <span className="sr-only">{calc.netProfit >= 0 ? "Profit" : "Loss"}:</span>
                    {`${calc.netProfit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(calc.netProfit))}`}
                  </>
                }
                valueClassName={`text-2xl font-bold ${calc.profitColor}`}
              />
              {calc.netProfitPercentage !== null && (
                <PriceRow
                  label="Return on spend:"
                  labelClassName="text-xs text-muted-foreground"
                  tooltip="Net profit as a percentage of your Costco purchase price."
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
            onClick={() => {
              posthog.capture("outbound_costco_click", {
                ...baseProductProperties,
                destination_url: product.url,
              });
            }}
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
              product.pureProductSku
                ? `View ${product.pureProductName ?? product.name} on Collect Pure`
                : `Search for ${product.name} on Collect Pure`
            }
            href={collectPureUrl}
            onClick={() => {
              posthog.capture("outbound_pure_click", {
                ...baseProductProperties,
                destination_url: collectPureUrl,
                has_exact_pure_match: Boolean(product.pureProductSku),
              });
            }}
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
