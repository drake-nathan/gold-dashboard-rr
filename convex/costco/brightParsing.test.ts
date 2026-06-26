import { expect, test } from "vitest";

import {
  brightDetailToProcessed,
  deriveMetalWeight,
  isInStock,
  parseCategoryProductUrls,
  parseDigitalDataProduct,
} from "./brightParsing";

const CATEGORY_HTML = `
<a class="MuiLink-root" data-testid="Link" href="https://www.costco.com/10-oz-silver-bar-pamp-lady-of-justice.product.4000439114.html" target="_self"><span>10 oz Silver Bar PAMP Lady of Justice</span></a>
<div data-testid="ProductImage_4000439114"><img src="https://bfasset.costco-static.com/x/4000439114-847__1"></div>
<a data-testid="Link" href="https://www.costco.com/10-oz-silver-bar-pamp-lady-of-justice.product.4000439114.html"><span>dup link same item</span></a>
<a data-testid="Link" href="https://www.costco.com/1-oz-the-perth-mint-dragon-rectangular-coin-20-count.product.4201024003.html"><span>1 oz The Perth Mint Dragon Rectangular Coin, 20-Count</span></a>
`;

const DETAIL_HTML = `
<script type="text/javascript">
    window.digitalData = {
        siteLang :  'en',
        pageName : 'Product Detail | 4000439114',
        pageType : 'Product Detail',
        product : {
          pid : '4000439114',
          sku : '2047010',
          prodDetailType : 'na',
          name : '10 oz Silver Bar PAMP Lady of Justice',
          inventoryStatus : 'in stock',
          priceMin : '719.99',
          priceMax : '719.99',
          membershipReq : 'member-only',
        },
    }
    window.digitalDataEvents = [];
</script>`;

const DETAIL_HTML_20COUNT = DETAIL_HTML.replace(
  "10 oz Silver Bar PAMP Lady of Justice",
  "1 oz PAMP Lady of Justice Silver Bar, 20-count",
)
  .replaceAll("'719.99'", "'1429.99'")
  .replace("'4000439114'", "'4000439075'");

test("parseCategoryProductUrls extracts and dedupes product URLs by item number", () => {
  const urls = parseCategoryProductUrls(CATEGORY_HTML);
  expect(urls).toHaveLength(2);
  expect(urls.map((u) => u.itemNumber).toSorted()).toStrictEqual(["4000439114", "4201024003"]);
  expect(urls[0].url).toContain(".product.4000439114.html");
});

test("parseDigitalDataProduct reads the product block", () => {
  const detail = parseDigitalDataProduct(DETAIL_HTML);
  expect(detail).toStrictEqual({
    inventoryStatus: "in stock",
    name: "10 oz Silver Bar PAMP Lady of Justice",
    pid: "4000439114",
    priceMax: "719.99",
    priceMin: "719.99",
    sku: "2047010",
  });
});

test("parseDigitalDataProduct returns null when block is absent", () => {
  expect(parseDigitalDataProduct("<html>no data layer here</html>")).toBeNull();
});

test("deriveMetalWeight pulls a weight token from the name", () => {
  expect(deriveMetalWeight("10 oz Silver Bar PAMP Lady of Justice")).toBe("10 oz");
  expect(deriveMetalWeight("1 oz PAMP Lady of Justice Silver Bar, 20-count")).toBe("1 oz");
  expect(deriveMetalWeight("Mystery Item")).toBeUndefined();
});

test("isInStock distinguishes in/out of stock", () => {
  expect(isInStock("in stock")).toBeTruthy();
  expect(isInStock("out of stock")).toBeFalsy();
  expect(isInStock("")).toBeFalsy();
});

test("brightDetailToProcessed maps a detail into a ProcessedProduct", () => {
  const detail = parseDigitalDataProduct(DETAIL_HTML)!;
  const proc = brightDetailToProcessed(detail, "https://www.costco.com/x.product.4000439114.html");
  expect(proc).not.toBeNull();
  // productId = Costco SKU; retailerId = Costco item number (matches Unwrangle keying).
  expect(proc!.id).toBe("2047010");
  expect(proc!.retailer_id).toBe("4000439114");
  expect(proc!.price).toBe(719.99);
  expect(proc!.in_stock).toBeTruthy();
  expect(proc!.metalType).toBe("silver");
  expect(proc!.metalWeight).toBe("10 oz");
  expect(proc!.pricePerOunce).toBeCloseTo(71.999, 2);
});

test("brightDetailToProcessed applies the count multiplier for 20-count packs", () => {
  const detail = parseDigitalDataProduct(DETAIL_HTML_20COUNT)!;
  const proc = brightDetailToProcessed(detail, "https://www.costco.com/x.product.4000439075.html");
  expect(proc!.price).toBe(1429.99);
  expect(proc!.metalType).toBe("silver");
  // 1 oz x 20-count = 20 troy oz total
  expect(proc!.metalWeight).toBe("20 Troy Ounce");
  expect(proc!.pricePerOunce).toBeCloseTo(71.4995, 2);
});
