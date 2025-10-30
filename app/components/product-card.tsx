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

import type { ProductCardData } from "./dashboard";

interface ProductCardProps {
  product: ProductCardData;
  totalCashbackPercentage: number;
}

export const ProductCard = ({
  product,
  totalCashbackPercentage,
}: ProductCardProps) => {
  // Calculate the adjusted spread with cashback
  const priceAfterCashback =
    product.currentPrice * (1 - totalCashbackPercentage / 100);
  const pricePerOzAfterCashback =
    product.currentPricePerOunce ?
      product.currentPricePerOunce * (1 - totalCashbackPercentage / 100)
    : null;

  const adjustedSpread =
    product.pureBidPricePerOz && pricePerOzAfterCashback ?
      pricePerOzAfterCashback - product.pureBidPricePerOz
    : null;

  const adjustedSpreadPercentage =
    adjustedSpread && pricePerOzAfterCashback ?
      (adjustedSpread / pricePerOzAfterCashback) * 100
    : null;

  const positiveColor = "text-red-600 dark:text-red-400";
  const negativeColor = "text-green-600 dark:text-green-400";

  const isPositiveSpread = (adjustedSpread ?? 0) > 0;
  const spreadColor = isPositiveSpread ? positiveColor : negativeColor;

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
          <Badge variant="outline">
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

        {/* Price */}
        <div className="space-y-1.5 rounded-lg border bg-muted/50 p-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Costco Price:</span>
            <span className="font-medium">
              ${product.currentPrice.toLocaleString()}
            </span>
          </div>
          {/* 
          {totalCashbackPercentage > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                After {totalCashbackPercentage.toFixed(1)}% cashback:
              </span>
              <span className="font-medium">
                ${priceAfterCashback.toLocaleString()}
              </span>
            </div>
          )} */}

          {product.pureBidPrice ?
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pure Bid Price:</span>
              <span className="font-medium">
                ${product.pureBidPrice.toLocaleString()}
              </span>
            </div>
          : null}

          {adjustedSpread !== null && (
            <>
              <div className="my-2 border-t" />
              <div className="flex justify-between">
                <span className="font-medium">Spread:</span>
                <span className={`font-bold ${spreadColor}`}>
                  ${adjustedSpread.toFixed(2)}
                </span>
              </div>
              {adjustedSpreadPercentage !== null && (
                <div className="flex justify-between">
                  <span className="font-medium">Spread %:</span>
                  <span className={`font-bold ${spreadColor}`}>
                    {adjustedSpreadPercentage.toFixed(2)}%
                  </span>
                </div>
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
