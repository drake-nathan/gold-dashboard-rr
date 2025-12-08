import { UserButton } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
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
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <a className="flex items-center gap-2" href="/">
              <span className="text-lg font-semibold">Dashboard.Gold</span>
            </a>
            <Badge variant="secondary">Admin</Badge>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="container py-6">
        {/* Stats Overview */}
        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <StatsCard
            count={counts.needs_review}
            icon={<AlertCircle className="h-4 w-4" />}
            label="Needs Review"
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
        <Tabs
          className="mt-6"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger className="gap-2" value="needs_review">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
              <Badge className="ml-1" variant="secondary">
                {counts.needs_review}
              </Badge>
            </TabsTrigger>
            <TabsTrigger className="gap-2" value="auto_matched">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Auto</span>
              <Badge className="ml-1" variant="secondary">
                {counts.auto_matched}
              </Badge>
            </TabsTrigger>
            <TabsTrigger className="gap-2" value="fallback">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Fallback</span>
              <Badge className="ml-1" variant="secondary">
                {counts.fallback}
              </Badge>
            </TabsTrigger>
            <TabsTrigger className="gap-2" value="manual_matched">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Approved</span>
              <Badge className="ml-1" variant="secondary">
                {counts.manual_matched}
              </Badge>
            </TabsTrigger>
            <TabsTrigger className="gap-2" value="unmatched">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">None</span>
              <Badge className="ml-1" variant="secondary">
                {counts.unmatched}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4 space-y-4" value="needs_review">
            {productsData.needs_review.length === 0 ? (
              <EmptyState message="No products need review" />
            ) : (
              productsData.needs_review.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            )}
          </TabsContent>

          <TabsContent className="mt-4 space-y-4" value="auto_matched">
            {productsData.auto_matched.length === 0 ? (
              <EmptyState message="No auto-matched products" />
            ) : (
              productsData.auto_matched.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            )}
          </TabsContent>

          <TabsContent className="mt-4 space-y-4" value="fallback">
            {productsData.fallback.length === 0 ? (
              <EmptyState message="No products using fallback" />
            ) : (
              productsData.fallback.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            )}
          </TabsContent>

          <TabsContent className="mt-4 space-y-4" value="manual_matched">
            {productsData.manual_matched.length === 0 ? (
              <EmptyState message="No approved products" />
            ) : (
              productsData.manual_matched.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            )}
          </TabsContent>

          <TabsContent className="mt-4 space-y-4" value="unmatched">
            {productsData.unmatched.length === 0 ? (
              <EmptyState message="No unmatched products" />
            ) : (
              productsData.unmatched.map((product) => (
                <ProductMatchCard key={product.productId} product={product} />
              ))
            )}
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
    info: "border-blue-500/50 bg-blue-500/10",
    muted: "border-muted",
    success: "border-green-500/50 bg-green-500/10",
    warning: "border-yellow-500/50 bg-yellow-500/10",
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
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

  // Query for the Pure product when we have a SKU
  const pureProduct = useQuery(
    api.admin.getPureProductBySku,
    parsedSku ? { sku: parsedSku } : "skip",
  );

  const parseUrl = () => {
    setError(null);
    setParsedSku(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LinkIcon className="h-4 w-4" />
          Pure URL Parser
        </CardTitle>
        <CardDescription>
          Paste a Collect Pure product URL to find its UUID
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
              setParsedSku(null);
            }}
            placeholder="https://www.collectpure.com/marketplace/product/..."
            value={url}
          />
          <Button onClick={parseUrl} size="sm">
            Parse
          </Button>
        </div>

        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

        {parsedSku ? <div className="mt-3 rounded-md border bg-muted/50 p-3">
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
            {pureProduct === null && (
              <p className="mt-1 text-sm text-destructive">
                Product not found in database
              </p>
            )}
            {pureProduct ? <div className="mt-2 space-y-1">
                <p className="text-sm font-medium">{pureProduct.productName}</p>
                <p className="text-sm">
                  <span className="text-muted-foreground">UUID:</span>{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {pureProduct.pureProductId}
                  </code>
                  <Button
                    className="ml-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(pureProduct.pureProductId);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Copy
                  </Button>
                </p>
                <p className="text-sm text-muted-foreground">
                  {pureProduct.weight} oz {pureProduct.metalType} •{" "}
                  {pureProduct.manufacturer ?? "Unknown manufacturer"}
                  {pureProduct.currentBidPrice ? ` • Bid: $${pureProduct.currentBidPrice.toLocaleString()}` : null}
                </p>
              </div> : null}
          </div> : null}
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
