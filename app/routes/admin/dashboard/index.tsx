import { UserButton } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Clock, HelpCircle, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProductList } from "./product-list";
import { StatsCard } from "./stats-card";
import type { AdminProductReviewCounts, AdminProductsForReviewStatus, ReviewTab } from "./types";
import { UrlParserCard } from "./url-parser-card";

export const AdminDashboard = ({
  initialProducts,
  productsData,
}: {
  initialProducts: AdminProductsForReviewStatus;
  productsData: AdminProductReviewCounts;
}) => {
  const [activeTab, setActiveTab] = useState<ReviewTab>("action_needed");
  const activeProductsQuery = useQuery(api.admin.getProductsForReviewStatus, {
    status: activeTab,
  });

  const counts = productsData;
  const activeProducts =
    activeProductsQuery ?? (activeTab === "action_needed" ? initialProducts : undefined);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
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

        <UrlParserCard />

        <Tabs
          className="mt-8"
          onValueChange={(value) => {
            setActiveTab(value as ReviewTab);
          }}
          value={activeTab}
        >
          <TabsList className="inline-flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger
              className="gap-1.5 rounded-full border bg-background px-3 py-1.5 data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500/10"
              value="action_needed"
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

          <TabsContent className="mt-6 space-y-4" value="action_needed">
            <ProductList products={activeTab === "action_needed" ? activeProducts : undefined} />
          </TabsContent>
          <TabsContent className="mt-6 space-y-4" value="auto_matched">
            <ProductList products={activeTab === "auto_matched" ? activeProducts : undefined} />
          </TabsContent>
          <TabsContent className="mt-6 space-y-4" value="fallback">
            <ProductList products={activeTab === "fallback" ? activeProducts : undefined} />
          </TabsContent>
          <TabsContent className="mt-6 space-y-4" value="manual_matched">
            <ProductList products={activeTab === "manual_matched" ? activeProducts : undefined} />
          </TabsContent>
          <TabsContent className="mt-6 space-y-4" value="unmatched">
            <ProductList products={activeTab === "unmatched" ? activeProducts : undefined} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
