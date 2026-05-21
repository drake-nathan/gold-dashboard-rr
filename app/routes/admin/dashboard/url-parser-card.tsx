import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { PureProductLookupResult } from "./types";

export const UrlParserCard = () => {
  const [url, setUrl] = useState("");
  const [parsedSku, setParsedSku] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addedProduct, setAddedProduct] = useState<null | PureProductLookupResult>(null);

  const pureProduct = useQuery(
    api.admin.getPureProductBySku,
    parsedSku ? { sku: parsedSku } : "skip",
  );
  const fetchAndAddProduct = useAction(api.admin.fetchAndAddPureProduct);

  const parseUrl = () => {
    setError(null);
    setParsedSku(null);
    setAddedProduct(null);

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const productIndex = pathParts.indexOf("product");

      if (productIndex === -1 || !pathParts[productIndex + 1]) {
        setError("Could not find product SKU in URL");
        return;
      }

      setParsedSku(pathParts[productIndex + 1]);
    } catch {
      setError("Invalid URL format");
    }
  };

  const handleAddFromPure = async () => {
    if (!parsedSku) return;

    setIsAdding(true);
    setError(null);

    try {
      const result = await fetchAndAddProduct({ sku: parsedSku });
      if (result.success && result.product) {
        setAddedProduct(result.product);
      } else {
        setError(result.error ?? "Failed to fetch product from Pure");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to add product");
    } finally {
      setIsAdding(false);
    }
  };

  const product = pureProduct ?? addedProduct;

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          Pure URL Parser
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only" id="pure-product-url-label">
              Collect Pure product URL
            </span>
            <input
              aria-labelledby="pure-product-url-label"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              onChange={(event) => {
                setUrl(event.target.value);
                setError(null);
                setParsedSku(null);
              }}
              placeholder="Paste a Collect Pure product URL..."
              value={url}
            />
          </label>
          <Button onClick={parseUrl} size="sm">
            Parse
          </Button>
        </div>

        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

        {parsedSku ? (
          <div className="mt-3 rounded-md border bg-muted/50 p-3">
            <p className="text-sm">
              <span className="text-muted-foreground">SKU:</span>{" "}
              <code className="rounded bg-muted px-1 py-0.5">{parsedSku}</code>
            </p>
            {pureProduct === undefined ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Looking up product...
              </p>
            ) : null}
            {pureProduct === null && !addedProduct ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-muted-foreground">Product not found in database</p>
                <Button
                  disabled={isAdding}
                  onClick={() => {
                    void handleAddFromPure();
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Fetching from Pure...
                    </>
                  ) : (
                    "Add from Pure API"
                  )}
                </Button>
              </div>
            ) : null}
            {product ? (
              <div className="mt-2 space-y-1">
                {addedProduct && !pureProduct ? (
                  <Badge className="mb-1 border-green-500/30 bg-green-500/10 text-green-600">
                    Added from Pure API
                  </Badge>
                ) : null}
                <p className="text-sm font-medium">{product.productName}</p>
                <p className="text-sm">
                  <span className="text-muted-foreground">UUID:</span>{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {product.pureProductId}
                  </code>
                  <Button
                    className="ml-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(product.pureProductId);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Copy
                  </Button>
                </p>
                <p className="text-sm text-muted-foreground">
                  {product.weight} oz {product.metalType} •{" "}
                  {product.manufacturer ?? "Unknown manufacturer"}
                  {product.currentBidPrice
                    ? ` • Bid: $${product.currentBidPrice.toLocaleString()}`
                    : null}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
