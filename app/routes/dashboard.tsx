import { api } from "convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { usePreloadedQuery } from "convex/react";

import { Dashboard } from "@/components/dashboard";

import type { Route } from "./+types/dashboard";

export const meta = () => [
  { title: "Gold Dashboard - Costco vs Collect Pure" },
  {
    content: "Compare Costco precious metals prices with Collect Pure bids",
    name: "description",
  },
];

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
          <div className="text-lg font-medium">No products found</div>
          <div className="text-sm text-muted-foreground">
            The database appears to be empty. Run the Costco and Collect Pure
            fetchers to populate data.
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard stats={stats} />;
};

export default Home;
