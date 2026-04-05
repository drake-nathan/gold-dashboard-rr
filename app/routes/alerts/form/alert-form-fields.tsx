import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { AlertFormType, AlertFormValues, ProductOption } from "./types";

const getProductLabel = (product: ProductOption) => `${product.name} (${product.metalType})`;

export const AlertFormFields = ({
  onChange,
  productOptions,
  values,
}: {
  onChange: (update: Partial<AlertFormValues>) => void;
  productOptions: ProductOption[];
  values: AlertFormValues;
}) => {
  const TYPE_DESCRIPTIONS: Record<AlertFormType, string> = {
    category: "Watch a group of products by metal, weight, or brand.",
    sku: "Track a specific Costco product for restocks or price drops.",
    threshold: "Alert when a product's markup over spot drops to your target.",
  };
  const selectedProduct =
    productOptions.find((product) => product.productId === values.skuProductId) ?? null;

  return (
    <>
      <Tabs
        onValueChange={(value) => {
          if (!value) return;
          onChange({ formType: value as AlertFormType });
        }}
        value={values.formType}
      >
        <TabsList className="w-full">
          <TabsTrigger className="flex-1" value="threshold">
            Threshold
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="sku">
            Product
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="category">
            Category
          </TabsTrigger>
        </TabsList>

        <p className="mb-2 text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[values.formType]}</p>

        <TabsContent className="space-y-4" value="threshold">
          <div className="space-y-1.5">
            <Label htmlFor="alert-above-spot">Max Markup (%)</Label>
            <Input
              id="alert-above-spot"
              onChange={(event) => {
                onChange({ aboveSpotThreshold: event.target.value });
              }}
              placeholder="e.g. 3"
              type="number"
              value={values.aboveSpotThreshold}
            />
            <p className="text-xs text-muted-foreground">
              Alert when the markup drops to this % or below.
            </p>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="sku">
          <div className="space-y-1.5">
            <Label htmlFor="alert-product">Product</Label>
            <Combobox
              filter={(product: ProductOption, query) => {
                const label = `${product.name} ${product.metalType}`.toLowerCase();
                return label.includes(query.toLowerCase());
              }}
              items={productOptions}
              itemToStringLabel={getProductLabel}
              itemToStringValue={(product: ProductOption) => product.productId}
              onValueChange={(product: null | ProductOption) => {
                onChange({ skuProductId: product?.productId ?? "" });
              }}
              value={selectedProduct}
            >
              <ComboboxInput
                className="w-full"
                id="alert-product"
                placeholder="Search products…"
                showClear={Boolean(values.skuProductId)}
              />
              <ComboboxContent>
                <ComboboxEmpty>No products found.</ComboboxEmpty>
                <ComboboxList>
                  {(product: ProductOption) => (
                    <ComboboxItem key={product.productId} value={product}>
                      {getProductLabel(product)}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-sku-trigger">Trigger On</Label>
            <Select
              items={{ in_stock: "Back in stock", price_drop: "Price drop" }}
              modal={false}
              onValueChange={(value) => {
                if (!value) return;
                onChange({
                  skuTriggerOn: value,
                });
              }}
              value={values.skuTriggerOn}
            >
              <SelectTrigger className="w-full" id="alert-sku-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent portal={false}>
                <SelectItem value="in_stock">Back in stock</SelectItem>
                <SelectItem value="price_drop">Price drop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="category">
          <div className="space-y-1.5">
            <Label htmlFor="alert-category-trigger">Trigger On</Label>
            <Select
              items={{ in_stock: "Back in stock", price_drop: "Price drop" }}
              modal={false}
              onValueChange={(value) => {
                if (!value) return;
                onChange({
                  categoryTriggerOn: value,
                });
              }}
              value={values.categoryTriggerOn}
            >
              <SelectTrigger id="alert-category-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent portal={false}>
                <SelectItem value="in_stock">Back in stock</SelectItem>
                <SelectItem value="price_drop">Price drop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-metal">Metal</Label>
            <Select
              items={{ any: "Any metal", gold: "Gold", silver: "Silver" }}
              modal={false}
              onValueChange={(value) => {
                if (!value) return;
                onChange({
                  categoryMetal: value === "any" ? "" : (value as "gold" | "silver"),
                });
              }}
              value={values.categoryMetal || "any"}
            >
              <SelectTrigger id="alert-metal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent portal={false}>
                <SelectItem value="any">Any metal</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-weight">Weight (oz)</Label>
            <Input
              id="alert-weight"
              onChange={(event) => {
                onChange({ categoryWeight: event.target.value });
              }}
              placeholder="Optional (e.g. 1)"
              type="number"
              value={values.categoryWeight}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-brand">Brand</Label>
            <Input
              id="alert-brand"
              onChange={(event) => {
                onChange({ brand: event.target.value });
              }}
              placeholder="Optional (e.g. PAMP)"
              value={values.brand}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-1.5">
        <Label htmlFor="alert-cooldown">Don&apos;t re-alert for</Label>
        <Select
          items={{
            "15": "15 minutes",
            "30": "30 minutes",
            "60": "1 hour",
            "240": "4 hours",
            "720": "12 hours",
            "1440": "1 day",
          }}
          modal={false}
          onValueChange={(value) => {
            if (!value) return;
            onChange({ cooldownMinutes: Number.parseInt(value, 10) });
          }}
          value={String(values.cooldownMinutes)}
        >
          <SelectTrigger className="w-full" id="alert-cooldown">
            <SelectValue />
          </SelectTrigger>
          <SelectContent portal={false}>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="240">4 hours</SelectItem>
            <SelectItem value="720">12 hours</SelectItem>
            <SelectItem value="1440">1 day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="alert-name">Name (optional)</Label>
        <Input
          id="alert-name"
          onChange={(event) => {
            onChange({ name: event.target.value });
          }}
          value={values.name}
        />
      </div>
    </>
  );
};
