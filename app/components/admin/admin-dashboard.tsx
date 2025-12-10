import { UserButton } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProductMatchCard } from "./product-match-card";

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("needs_review");

  const productsData = useQuery(api.admin.getProductsForReview);

  if (!productsData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading products...</span>
        </div>
      </div>
    );
  }

  const { counts } = productsData;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <a className="flex items-center gap-2" href="/">
              <span className="text-lg font-semibold">Dashboard.Gold</span>
            </a>
            <Badge variant="secondary">Admin</Badge>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatsCard
            count={counts.needs_review + counts.pending_approval}
            icon={<AlertCircle className="h-4 w-4" />}
            label="Action Needed"
            variant="warning"
          />
          <StatsCard
            count={counts.auto_matched}
            icon={<Sparkles className="h-4 w-4" />}
            label="Auto Matched"
            variant="info"
          />
          <StatsCard
            count={counts.fallback}
            icon={<HelpCircle className="h-4 w-4" />}
            label="Using Fallback"
            variant="muted"
          />
          <StatsCard
            count={counts.manual_matched}
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Approved"
            variant="success"
          />
          <StatsCard
            count={counts.unmatched}
            icon={<Clock className="h-4 w-4" />}
            label="Unmatched"
            variant="muted"
          />
        </div>

        {/* URL Parser Card */}
        <UrlParserCard />

        {/* Product Tabs */}
        <Tabs className="mt-8" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="inline-flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger
              className="gap-1.5 rounded-full border bg-background px-3 py-1.5 data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500/10"
              value="needs_review"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Action</span>
              <Badge className="ml-0.5 h-5 px-1.5" variant="secondary">
                {counts.needs_review + counts.pending_approval}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              className="gap-1.5 rounded-full border bg-background px-3 py-1.5 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-500/10"
              value="auto_matched"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Auto</span>
              <Badge className="ml-0.5 h-5 px-1.5" variant="secondary">
                {counts.auto_matched}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              className="gap-1.5 rounded-full border bg-background px-3 py-1.5 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10"
              value="fallback"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Fallback</span>
              <Badge className="ml-0.5 h-5 px-1.5" variant="secondary">
                {counts.fallback}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              className="gap-1.5 rounded-full border bg-background px-3 py-1.5 data-[state=active]:border-green-500 data-[state=active]:bg-green-500/10"
              value="manual_matched"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Approved</span>
              <Badge className="ml-0.5 h-5 px-1.5" variant="secondary">
                {counts.manual_matched}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              className="gap-1.5 rounded-full border bg-background px-3 py-1.5 data-[state=active]:border-muted-foreground data-[state=active]:bg-muted"
              value="unmatched"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>None</span>
              <Badge className="ml-0.5 h-5 px-1.5" variant="secondary">
                {counts.unmatched}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6 space-y-4" value="needs_review">
            {(
              productsData.needs_review.length === 0 &&
              productsData.pending_approval.length === 0
            ) ?
              <EmptyState message="No products need action" />
            : [
                ...productsData.pending_approval,
                ...productsData.needs_review,
              ].map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            }
          </TabsContent>

          <TabsContent className="mt-6 space-y-4" value="auto_matched">
            {productsData.auto_matched.length === 0 ?
              <EmptyState message="No auto-matched products" />
            : productsData.auto_matched.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            }
          </TabsContent>

          <TabsContent className="mt-6 space-y-4" value="fallback">
            {productsData.fallback.length === 0 ?
              <EmptyState message="No products using fallback" />
            : productsData.fallback.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            }
          </TabsContent>

          <TabsContent className="mt-6 space-y-4" value="manual_matched">
            {productsData.manual_matched.length === 0 ?
              <EmptyState message="No approved products" />
            : productsData.manual_matched.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            }
          </TabsContent>

          <TabsContent className="mt-6 space-y-4" value="unmatched">
            {productsData.unmatched.length === 0 ?
              <EmptyState message="No unmatched products" />
            : productsData.unmatched.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            }
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const StatsCard = ({
  count,
  icon,
  label,
  variant,
}: {
  count: number;
  icon: React.ReactNode;
  label: string;
  variant: "info" | "muted" | "success" | "warning";
}) => {
  const variantClasses = {
    info: "border-blue-500/30 bg-blue-500/5",
    muted: "border-border bg-muted/30",
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
  };

  const iconClasses = {
    info: "text-blue-500",
    muted: "text-muted-foreground",
    success: "text-green-500",
    warning: "text-yellow-500",
  };

  return (
    <Card className={`${variantClasses[variant]} shadow-none`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={iconClasses[variant]}>{icon}</div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const UrlParserCard = () => {
  const [url, setUrl] = useState("");
  const [parsedSku, setParsedSku] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addedProduct, setAddedProduct] = useState<null | {
    currentBidPrice: null | number;
    manufacturer: null | string;
    metalType: "gold" | "silver";
    productName: string;
    pureProductId: string;
    sku: string;
    weight: number;
  }>(null);

  // Query for the Pure product when we have a SKU
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
      // Extract SKU from Pure URL
      // Format: https://www.collectpure.com/marketplace/product/{sku}
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const productIndex = pathParts.indexOf("product");

      if (productIndex === -1 || !pathParts[productIndex + 1]) {
        setError("Could not find product SKU in URL");
        return;
      }

      const sku = pathParts[productIndex + 1];
      setParsedSku(sku);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setIsAdding(false);
    }
  };

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
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
              setParsedSku(null);
            }}
            placeholder="Paste a Collect Pure product URL..."
            value={url}
          />
          <Button onClick={parseUrl} size="sm">
            Parse
          </Button>
        </div>

        {error ?
          <p className="mt-2 text-sm text-destructive">{error}</p>
        : null}

        {parsedSku ?
          <div className="mt-3 rounded-md border bg-muted/50 p-3">
            <p className="text-sm">
              <span className="text-muted-foreground">SKU:</span>{" "}
              <code className="rounded bg-muted px-1 py-0.5">{parsedSku}</code>
            </p>
            {pureProduct === undefined && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Looking up product...
              </p>
            )}
            {pureProduct === null && !addedProduct && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Product not found in database
                </p>
                <Button
                  disabled={isAdding}
                  onClick={handleAddFromPure}
                  size="sm"
                  variant="secondary"
                >
                  {isAdding ?
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Fetching from Pure...
                    </>
                  : "Add from Pure API"}
                </Button>
              </div>
            )}
            {(() => {
              const product = pureProduct ?? addedProduct;
              if (!product) return null;
              return (
                <div className="mt-2 space-y-1">
                  {addedProduct && !pureProduct ?
                    <Badge className="mb-1 border-green-500/30 bg-green-500/10 text-green-600">
                      Added from Pure API
                    </Badge>
                  : null}
                  <p className="text-sm font-medium">{product.productName}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">UUID:</span>{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      {product.pureProductId}
                    </code>
                    <Button
                      className="ml-2"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          product.pureProductId,
                        );
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
                    {product.currentBidPrice ?
                      ` • Bid: $${product.currentBidPrice.toLocaleString()}`
                    : null}
                  </p>
                </div>
              );
            })()}
          </div>
        : null}
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center py-12">
      <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/50" />
      <p className="text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
);
