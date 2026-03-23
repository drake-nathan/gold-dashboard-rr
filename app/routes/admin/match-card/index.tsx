import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/format";

import { ApproveButton } from "./approve-button";
import { MatchSelector } from "./match-selector";
import { RematchButton } from "./rematch-button";
import { StatusBadge } from "./status-badge";
import { TopMatchesList } from "./top-matches-list";
import type { ProductForReview } from "./types";

export const ProductMatchCard = ({ product }: { product: ProductForReview }) => {
  const [expanded, setExpanded] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {product.thumbnail ? (
            <img
              alt={product.name}
              className="h-16 w-16 rounded-md border bg-white object-contain"
              src={product.thumbnail}
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="leading-tight font-medium">{product.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={product.metalType === "gold" ? "default" : "secondary"}>
                    {product.metalType}
                  </Badge>
                  {product.metalWeight ? (
                    <span className="text-sm text-muted-foreground">{product.metalWeight}</span>
                  ) : null}
                  <Badge variant={product.currentInStock ? "outline" : "destructive"}>
                    {product.currentInStock ? "In Stock" : "Out of Stock"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatCurrency(product.currentPrice)}
                  </span>
                </div>
              </div>

              <StatusBadge status={product.matchStatus} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div
          className={`flex items-center justify-between rounded-md border p-3 ${
            product.matchStatus === "pending_approval"
              ? "border-purple-500/50 bg-purple-500/10"
              : "bg-muted/50"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
              Current Match
              {product.matchStatus === "pending_approval" ? (
                <Badge className="border-purple-500/30 bg-purple-500/20 px-1.5 py-0 text-[10px] text-purple-600">
                  Pending Confirmation
                </Badge>
              ) : null}
            </p>
            {product.pureProduct ? (
              <div>
                <p className="text-sm font-medium">{product.pureProduct.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {product.pureProduct.weight} oz • {product.pureProduct.manufacturer ?? "Generic"}
                  {product.pureProduct.isGenericFallback ? " (Fallback)" : null}
                  {product.pureProduct.currentBidPrice
                    ? ` • Bid: ${formatCurrency(product.pureProduct.currentBidPrice)}`
                    : null}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No match assigned</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {product.pureProduct?.sku ? (
              <Button asChild size="sm" variant="ghost">
                <a
                  href={`https://www.collectpure.com/marketplace/product/${product.pureProduct.sku}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : null}
            <Dialog onOpenChange={setShowChangeDialog} open={showChangeDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Change
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Change Match for: {product.name}</DialogTitle>
                  <DialogDescription>
                    Select a Pure product to match with this Costco product
                  </DialogDescription>
                </DialogHeader>
                <MatchSelector
                  costcoProductId={product.productId}
                  metalType={product.metalType}
                  onSelect={() => {
                    setShowChangeDialog(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div>
          <Button
            className="w-full justify-between"
            onClick={() => {
              setExpanded(!expanded);
            }}
            size="sm"
            variant="ghost"
          >
            <span>View Top Matches & Actions</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {expanded ? (
            <div className="mt-3 space-y-3">
              <TopMatchesList
                costcoProductId={product.productId}
                currentPureProductId={product.pureProductId}
              />

              <div className="flex items-center gap-2 border-t pt-2">
                <ApproveButton
                  costcoProductId={product.productId}
                  currentPureProductId={product.pureProductId}
                  matchStatus={product.matchStatus}
                />
                <RematchButton />
                <Button asChild size="sm" variant="outline">
                  <a href={product.url} rel="noopener noreferrer" target="_blank">
                    View on Costco
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
