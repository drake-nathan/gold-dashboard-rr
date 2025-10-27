// src/convex/crons.ts
import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Business hours: 9 AM - 6 PM CT
// CT to UTC: UTC is 7 hours ahead of CT
// 9 AM CT = 3 PM UTC (15:00), 6 PM CT = 1 AM UTC next day (01:00)

// Fetch Costco prices every 20 minutes during business hours
crons.cron(
  "fetch-costco-business-hours",
  "*/20 15-23,0 * * *", // Every 20 minutes from 3 PM - 1 AM UTC (9 AM - 6 PM CT)
  internal.costco.fetchNewData,
);

// Fetch Costco prices every hour during off-hours (to catch any overnight changes)
crons.cron(
  "fetch-metals-off-hours",
  "0 2-14 * * *", // Every hour from 2 AM - 2 PM UTC (7 PM - 7 AM CT)
  internal.costco.fetchNewData,
);

// Fetch Collect Pure prices every 15 minutes during business hours
// (More frequent since these are bid prices that change more often)
crons.cron(
  "fetch-pure-business-hours",
  "*/15 15-23,0 * * *", // Every 15 minutes from 3 PM - 1 AM UTC (9 AM - 6 PM CT)
  internal.pure.fetchNewData,
);

// Fetch Collect Pure prices every 30 minutes during off-hours
crons.cron(
  "fetch-pure-off-hours",
  "*/30 2-14 * * *", // Every 30 minutes from 2 AM - 2 PM UTC (7 PM - 7 AM CT)
  internal.pure.fetchNewData,
);

// Fetch market prices (gold, silver, bitcoin) from Gold API
// Every 5 minutes, 24/7 (no rate limits for real-time prices)
crons.cron(
  "fetch-market-prices",
  "*/5 * * * *", // Every 5 minutes, 24/7
  internal.twelve.fetchMarketPrices,
);

export default crons;
