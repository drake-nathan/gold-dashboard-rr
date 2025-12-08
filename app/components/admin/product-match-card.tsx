import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

interface ProductForReview {
  _id: string;
  currentInStock: boolean;
  currentPrice: number;
  firstSeen: number;
  matchApprovedAt: null | number | undefined;
  matchApprovedBy: null | string | undefined;
  matchStatus: null | string | undefined;
  metalType: "gold" | "silver";
  metalWeight: null | string;
  name: string;
  productId: string;
  pureProduct: null | {
    currentBidPrice: null | number;
    isGenericFallback: boolean | undefined;
    manufacturer: null | string;
    productName: string;
    pureProductId: string;
    sku: null | string | undefined;
    weight: number;
  };
  pureProductId: null | string | undefined;
  thumbnail: null | string;
  url: string;
}

export const ProductMatchCard = ({ product }: { product: ProductForReview }) => {
  const [expanded, setExpanded] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* Product Image */}
          {product.thumbnail ? <img
              alt={product.name}
              className="h-16 w-16 rounded-md border object-contain bg-white"
              src={product.thumbnail}
            /> : null}

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium leading-tight">{product.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={product.metalType === "gold" ? "default" : "secondary"}>
                    {product.metalType}
                  </Badge>
                  {product.metalWeight ? <span className="text-sm text-muted-foreground">
                      {product.metalWeight}
                    </span> : null}
                  <Badge variant={product.currentInStock ? "outline" : "destructive"}>
                    {product.currentInStock ? "In Stock" : "Out of Stock"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatCurrency(product.currentPrice)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <StatusBadge status={product.matchStatus} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current Match */}
        <div className={`flex items-center justify-between rounded-md border p-3 ${
          product.matchStatus === "pending_approval"
            ? "border-purple-500/50 bg-purple-500/10"
            : "bg-muted/50"
        }`}>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
              Current Match
              {product.matchStatus === "pending_approval" && (
                <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-[10px] px-1.5 py-0">
                  Pending Confirmation
                </Badge>
              )}
            </p>
            {product.pureProduct ? (
              <div>
                <p className="font-medium text-sm">{product.pureProduct.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {product.pureProduct.weight} oz •{" "}
                  {product.pureProduct.manufacturer ?? "Generic"}
                  {product.pureProduct.isGenericFallback ? " (Fallback)" : null}
                  {product.pureProduct.currentBidPrice ? ` • Bid: ${formatCurrency(product.pureProduct.currentBidPrice)}` : null}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No match assigned</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {product.pureProduct?.sku ? <Button asChild size="sm" variant="ghost">
                <a
                  href={`https://www.collectpure.com/marketplace/product/${product.pureProduct.sku}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button> : null}
            <Dialog onOpenChange={setShowChangeDialog} open={showChangeDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Change
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Change Match for: {product.name}</DialogTitle>
                  <DialogDescription>
                    Select a Pure product to match with this Costco product
                  </DialogDescription>
                </DialogHeader>
                <MatchSelector
                  costcoProductId={product.productId}
                  metalType={product.metalType}
                  onSelect={() => { setShowChangeDialog(false); }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Expandable Section - Top Matches */}
        <div>
          <Button
            className="w-full justify-between"
            onClick={() => { setExpanded(!expanded); }}
            size="sm"
            variant="ghost"
          >
            <span>View Top Matches & Actions</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {expanded ? <div className="mt-3 space-y-3">
              <TopMatchesList
                costcoProductId={product.productId}
                currentPureProductId={product.pureProductId}
              />

              <div className="flex items-center gap-2 pt-2 border-t">
                <ApproveButton
                  costcoProductId={product.productId}
                  currentPureProductId={product.pureProductId}
                  matchStatus={product.matchStatus}
                />
                <RematchButton _costcoProductId={product.productId} />
                <Button asChild size="sm" variant="outline">
                  <a
                    href={product.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View on Costco
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div> : null}
        </div>
      </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: null | string | undefined }) => {
  switch (status) {
    case "auto_matched": {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Auto</Badge>;
    }
    case "fallback": {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Fallback</Badge>;
    }
    case "manual_matched": {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
    }
    case "pending_approval": {
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">Pending</Badge>;
    }
    case "needs_review": {
      return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">Review</Badge>;
    }
    default: {
      return <Badge variant="outline">Unmatched</Badge>;
    }
  }
};

const TopMatchesList = ({
  costcoProductId,
  currentPureProductId,
}: {
  costcoProductId: string;
  currentPureProductId: null | string | undefined;
}) => {
  const topMatches = useQuery(api.admin.getTopMatches, {
    costcoProductId,
    limit: 5,
  });

  const selectMatch = useMutation(api.admin.selectMatch);

  if (!topMatches) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading matches...
      </div>
    );
  }

  const handleSelectMatch = async (pureProductId: string) => {
    try {
      await selectMatch({ costcoProductId, pureProductId });
      toast.success("Match selected - confirm when ready");
    } catch (error) {
      toast.error("Failed to select match");
      console.error(error);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        Top Matches (Score-based)
      </p>

      {topMatches.matches.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No matches found</p>
      ) : (
        <div className="space-y-1">
          {topMatches.matches.map((match, index) => (
            <div
              className={`flex items-center justify-between rounded-md border p-2 text-sm ${
                match.pureProductId === currentPureProductId
                  ? "border-green-500/50 bg-green-500/10"
                  : "hover:bg-muted/50"
              }`}
              key={match.pureProductId}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="font-medium truncate">{match.productName}</span>
                  {match.pureProductId === currentPureProductId && (
                    <Badge className="text-xs" variant="outline">Current</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    Score: {match.score} • {match.weight} oz •{" "}
                    {match.manufacturer ?? "Unknown"}
                    {match.isGenericFallback ? " (Generic)" : null}
                  </span>
                </div>
                {match.details.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Matched: {match.details.join(", ")}
                  </p>
                )}
              </div>
              <Button
                disabled={match.pureProductId === currentPureProductId}
                onClick={() => handleSelectMatch(match.pureProductId)}
                size="sm"
                variant="ghost"
              >
                {match.pureProductId === currentPureProductId ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  "Select"
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Fallback Option */}
      {topMatches.fallback ? <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Weight-based Fallback
          </p>
          <div
            className={`flex items-center justify-between rounded-md border p-2 text-sm ${
              topMatches.fallback.pureProductId === currentPureProductId
                ? "border-green-500/50 bg-green-500/10"
                : "hover:bg-muted/50"
            }`}
          >
            <div>
              <span className="font-medium">{topMatches.fallback.productName}</span>
              <p className="text-xs text-muted-foreground">
                {topMatches.fallback.weight} oz •{" "}
                {topMatches.fallback.manufacturer ?? "Generic"}
              </p>
            </div>
            <Button
              disabled={topMatches.fallback.pureProductId === currentPureProductId}
              onClick={() => handleSelectMatch(topMatches.fallback!.pureProductId)}
              size="sm"
              variant="ghost"
            >
              {topMatches.fallback.pureProductId === currentPureProductId ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                "Use Fallback"
              )}
            </Button>
          </div>
        </div> : null}
    </div>
  );
};

const MatchSelector = ({
  costcoProductId,
  metalType,
  onSelect,
}: {
  costcoProductId: string;
  metalType: "gold" | "silver";
  onSelect: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [pureUrl, setPureUrl] = useState("");
  const [parsedSku, setParsedSku] = useState<null | string>(null);

  const selectMatch = useMutation(api.admin.selectMatch);

  // Search results
  const searchResults = useQuery(
    api.admin.searchPureProducts,
    searchQuery.length >= 2 ? { limit: 10, metalType, query: searchQuery } : "skip",
  );

  // URL lookup
  const pureProductFromUrl = useQuery(
    api.admin.getPureProductBySku,
    parsedSku ? { sku: parsedSku } : "skip",
  );

  const parseUrl = () => {
    try {
      const urlObj = new URL(pureUrl);
      const pathParts = urlObj.pathname.split("/");
      const productIndex = pathParts.indexOf("product");
      if (productIndex !== -1 && pathParts[productIndex + 1]) {
        setParsedSku(pathParts[productIndex + 1]);
      }
    } catch {
      // Invalid URL
    }
  };

  const handleSelectMatch = async (pureProductId: string) => {
    try {
      await selectMatch({ costcoProductId, pureProductId });
      toast.success("Match selected - confirm when ready");
      onSelect();
    } catch (error) {
      toast.error("Failed to select match");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL Paste Section */}
      <div>
        <label className="text-sm font-medium">Paste Pure URL</label>
        <div className="flex gap-2 mt-1">
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => {
              setPureUrl(e.target.value);
              setParsedSku(null);
            }}
            placeholder="https://www.collectpure.com/marketplace/product/..."
            value={pureUrl}
          />
          <Button onClick={parseUrl} size="sm" variant="secondary">
            Find
          </Button>
        </div>
        {pureProductFromUrl ? <div className="mt-2 flex items-center justify-between rounded-md border bg-green-500/10 p-2">
            <div>
              <p className="font-medium text-sm">{pureProductFromUrl.productName}</p>
              <p className="text-xs text-muted-foreground">
                {pureProductFromUrl.weight} oz • {pureProductFromUrl.manufacturer ?? "Generic"}
              </p>
            </div>
            <Button onClick={() => handleSelectMatch(pureProductFromUrl.pureProductId)} size="sm">
              Use This
            </Button>
          </div> : null}
        {parsedSku && pureProductFromUrl === null ? <p className="mt-2 text-sm text-destructive">Product not found in database</p> : null}
      </div>

      {/* Search Section */}
      <div>
        <label className="text-sm font-medium">Search Pure Products</label>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
          onChange={(e) => { setSearchQuery(e.target.value); }}
          placeholder="Search by name, SKU, or manufacturer..."
          value={searchQuery}
        />

        {searchResults && searchResults.length > 0 ? <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
            {searchResults.map((product) => (
              <div
                className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/50"
                key={product.pureProductId}
              >
                <div>
                  <p className="font-medium text-sm">{product.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.weight} oz • {product.manufacturer ?? "Generic"}
                    {product.currentBidPrice ? ` • Bid: ${formatCurrency(product.currentBidPrice)}` : null}
                  </p>
                </div>
                <Button
                  onClick={() => handleSelectMatch(product.pureProductId)}
                  size="sm"
                  variant="ghost"
                >
                  Select
                </Button>
              </div>
            ))}
          </div> : null}

        {searchQuery.length >= 2 && searchResults?.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No products found</p>
        )}
      </div>
    </div>
  );
};

const ApproveButton = ({
  costcoProductId,
  currentPureProductId,
  matchStatus,
}: {
  costcoProductId: string;
  currentPureProductId: null | string | undefined;
  matchStatus: null | string | undefined;
}) => {
  const selectMatch = useMutation(api.admin.selectMatch);
  const confirmMatch = useMutation(api.admin.confirmMatch);
  const [loading, setLoading] = useState(false);

  const isPending = matchStatus === "pending_approval";
  const isApproved = matchStatus === "manual_matched";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmMatch({ costcoProductId });
      toast.success("Match confirmed and approved");
    } catch (error) {
      toast.error("Failed to confirm match");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!currentPureProductId) {
      toast.error("No match to approve");
      return;
    }

    setLoading(true);
    try {
      await selectMatch({ costcoProductId, pureProductId: currentPureProductId });
      toast.success("Match selected - click Confirm to finalize");
    } catch (error) {
      toast.error("Failed to select match");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (isApproved) {
    return (
      <Button disabled size="sm" variant="outline">
        <Check className="mr-1 h-3 w-3" />
        Approved
      </Button>
    );
  }

  if (isPending) {
    return (
      <Button
        disabled={loading}
        onClick={handleConfirm}
        size="sm"
        className="bg-purple-600 hover:bg-purple-700"
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Check className="mr-1 h-3 w-3" />
        )}
        Confirm Match
      </Button>
    );
  }

  return (
    <Button
      disabled={!currentPureProductId || loading}
      onClick={handleApprove}
      size="sm"
    >
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <Check className="mr-1 h-3 w-3" />
      )}
      Approve Match
    </Button>
  );
};

const RematchButton = ({ _costcoProductId }: { _costcoProductId: string }) => {
  // Note: For a full rematch implementation, use useAction from convex/react
  // with api.admin.rematchProduct. For now, users can use "Change" button.

  return (
    <Button
      onClick={() => {
        toast.info("Use 'Change' button to manually select a new match");
      }}
      size="sm"
      variant="outline"
    >
      <RefreshCw className="mr-1 h-3 w-3" />
      Rematch
    </Button>
  );
};
