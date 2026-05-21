import { expect, test } from "vitest";
import { render } from "vitest-browser-react";

import type { DashboardMarketPrice } from "../types";
import { Stats } from "./stats";

const goldPrice: DashboardMarketPrice = {
  assetType: "gold",
  currentPrice: 2400.5,
  percentChange: 1.23,
  symbol: "XAU",
};

const silverPrice: DashboardMarketPrice = {
  assetType: "silver",
  currentPrice: 30.12,
  percentChange: -0.45,
  symbol: "XAG",
};

test("renders an unavailable placeholder for missing market assets", async () => {
  const screen = await render(
    <Stats
      lastFetch={null}
      marketPrices={[goldPrice, silverPrice]}
      totalCashbackPercentage={2.5}
    />,
  );

  // Present assets render with the standard label.
  await expect.element(screen.getByText("Gold (XAU)")).toBeInTheDocument();
  await expect.element(screen.getByText("Silver (XAG)")).toBeInTheDocument();

  // Missing assets render an explicit unavailable card instead of disappearing.
  await expect.element(screen.getByText("Bitcoin (BTC) (unavailable)")).toBeInTheDocument();
  await expect.element(screen.getByText("S&P 500 (unavailable)")).toBeInTheDocument();

  // Unavailable cards use an em dash placeholder for the value.
  const dashValues = screen.getByText("—").elements();
  expect(dashValues).toHaveLength(2);
});

test("renders all four asset cards when every market price is present", async () => {
  const screen = await render(
    <Stats
      lastFetch={null}
      marketPrices={[
        goldPrice,
        silverPrice,
        { assetType: "bitcoin", currentPrice: 95_000, percentChange: 2.1, symbol: "BTC" },
        { assetType: "sp500", currentPrice: 5800, percentChange: 0.4, symbol: "SPX" },
      ]}
      totalCashbackPercentage={2.5}
    />,
  );

  await expect.element(screen.getByText("Gold (XAU)")).toBeInTheDocument();
  await expect.element(screen.getByText("Silver (XAG)")).toBeInTheDocument();
  await expect.element(screen.getByText("Bitcoin (BTC)")).toBeInTheDocument();
  await expect.element(screen.getByText("S&P 500")).toBeInTheDocument();
});
