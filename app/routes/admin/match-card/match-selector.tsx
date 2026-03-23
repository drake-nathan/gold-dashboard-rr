import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";

export const MatchSelector = ({
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
  const searchResults = useQuery(
    api.admin.searchPureProducts,
    searchQuery.length >= 2 ? { limit: 10, metalType, query: searchQuery } : "skip",
  );
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
      <div>
        <label className="text-sm font-medium" htmlFor="pure-url-input">
          Paste Pure URL
        </label>
        <div className="mt-1 flex gap-2">
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            id="pure-url-input"
            onChange={(event) => {
              setPureUrl(event.target.value);
              setParsedSku(null);
            }}
            placeholder="https://www.collectpure.com/marketplace/product/..."
            value={pureUrl}
          />
          <Button onClick={parseUrl} size="sm" variant="secondary">
            Find
          </Button>
        </div>
        {pureProductFromUrl ? (
          <div className="mt-2 flex items-center justify-between rounded-md border bg-green-500/10 p-2">
            <div>
              <p className="text-sm font-medium">{pureProductFromUrl.productName}</p>
              <p className="text-xs text-muted-foreground">
                {pureProductFromUrl.weight} oz • {pureProductFromUrl.manufacturer ?? "Generic"}
              </p>
            </div>
            <Button
              onClick={() => void handleSelectMatch(pureProductFromUrl.pureProductId)}
              size="sm"
            >
              Use This
            </Button>
          </div>
        ) : null}
        {parsedSku && pureProductFromUrl === null ? (
          <p className="mt-2 text-sm text-destructive">Product not found in database</p>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="pure-search-input">
          Search Pure Products
        </label>
        <input
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          id="pure-search-input"
          onChange={(event) => {
            setSearchQuery(event.target.value);
          }}
          placeholder="Search by name, SKU, or manufacturer..."
          value={searchQuery}
        />

        {searchResults && searchResults.length > 0 ? (
          <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
            {searchResults.map((product) => (
              <div
                className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/50"
                key={product.pureProductId}
              >
                <div>
                  <p className="text-sm font-medium">{product.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.weight} oz • {product.manufacturer ?? "Generic"}
                    {product.currentBidPrice
                      ? ` • Bid: ${formatCurrency(product.currentBidPrice)}`
                      : null}
                  </p>
                </div>
                <Button
                  onClick={() => void handleSelectMatch(product.pureProductId)}
                  size="sm"
                  variant="ghost"
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {searchQuery.length >= 2 && searchResults?.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No products found</p>
        ) : null}
      </div>
    </div>
  );
};
