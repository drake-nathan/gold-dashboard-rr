import { api } from "convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { usePreloadedQuery } from "convex/react";

import { Dashboard } from "@/components/dashboard";

import type { Route } from "./+types/dashboard";

export const meta = () => {
  const title = "Gold Dashboard - Live Costco vs Collect Pure Price Comparison";
  const description =
    "Real-time price comparison for Costco gold and silver products vs Collect Pure bids. Calculate your profit with cashback rewards. Updated every 5 minutes.";
  const url = "https://gold-dashboard-rr-production.up.railway.app"; // TODO: Replace with your actual domain
  const imageUrl = `${url}/og-image.png`; // TODO: Create OG image

  return [
    // Basic meta tags
    { title },
    { content: description, name: "description" },
    {
      content:
        "costco gold, costco silver, precious metals, gold price comparison, collect pure, gold arbitrage, costco bullion",
      name: "keywords",
    },

    // Open Graph (Facebook, LinkedIn, etc.)
    { content: "website", property: "og:type" },
    { content: url, property: "og:url" },
    { content: title, property: "og:title" },
    { content: description, property: "og:description" },
    { content: imageUrl, property: "og:image" },
    { content: "1200", property: "og:image:width" },
    { content: "630", property: "og:image:height" },
    { content: "Gold Dashboard", property: "og:site_name" },
    { content: "en_US", property: "og:locale" },

    // Twitter Card
    { content: "summary_large_image", name: "twitter:card" },
    { content: url, name: "twitter:url" },
    { content: title, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: imageUrl, name: "twitter:image" },

    // Additional SEO
    { content: "index, follow", name: "robots" },
    { content: "Gold Dashboard", name: "author" },
    { content: "#D4AF37", name: "theme-color" }, // Gold color
  ];
};

export const loader = async () => {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }
  // Use Convex's preloadQuery - this creates a payload that includes both the data
  // and the query metadata needed for client-side subscription
  const preloadedStats = await preloadQuery(
    api.dashboard.getStats,
    {},
    {
      url: convexUrl,
    },
  );

  return { preloadedStats };
};

const Home = ({ loaderData }: Route.ComponentProps) => {
  const stats = usePreloadedQuery(loaderData.preloadedStats);
  // const stats = useQuery(api.dashboard.getStats);

  // Check if there's actually no data
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Error</div>
          <div className="text-sm text-muted-foreground">
            We&apos;re having an issue connecting to our database, please try
            again later.
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard stats={stats} />;
};

export default Home;
