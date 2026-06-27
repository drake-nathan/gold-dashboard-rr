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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { categoryWeightGroupControlLabels, categoryWeightGroups } from "../weight-groups";
import type { AlertFormType, AlertFormValues, ProductOption } from "./types";

const getProductLabel = (product: ProductOption) => `${product.name} (${product.metalType})`;
const anyBrandValue = "__any_brand__";

const TYPE_DESCRIPTIONS: Record<AlertFormType, string> = {
  category: "Watch a group of products by metal, weight, or brand.",
  sku: "Track a specific Costco product and alert when it comes back in stock.",
  threshold: "Alert when a product's markup over spot drops to your target.",
};

export const AlertFormFields = ({
  brandOptions,
  onChange,
  productOptions,
  showValidationErrors = false,
  values,
}: {
  brandOptions: string[];
  onChange: (update: Partial<AlertFormValues>) => void;
  productOptions: ProductOption[];
  showValidationErrors?: boolean;
  values: AlertFormValues;
}) => {
  const selectedProduct =
    productOptions.find((product) => product.productId === values.skuProductId) ?? null;
  const mergedBrandOptions =
    values.brand && !brandOptions.includes(values.brand)
      ? [...brandOptions, values.brand].toSorted((a, b) => a.localeCompare(b))
      : brandOptions;

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
          <TabsTrigger className="flex-1" value="category">
            Category
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="threshold">
            Threshold
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="sku">
            Product
          </TabsTrigger>
        </TabsList>

        <p className="mb-2 text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[values.formType]}</p>

        <TabsContent className="space-y-4" value="category">
          <div className="space-y-1.5">
            <Label>Metal</Label>
            <ToggleGroup
              className="w-full"
              onValueChange={(groupValue) => {
                const nextValue = groupValue[0];
                if (!nextValue) return;
                onChange({
                  categoryMetal: nextValue === "any" ? "" : (nextValue as "gold" | "silver"),
                });
              }}
              value={[values.categoryMetal || "gold"]}
              variant="outline"
            >
              <ToggleGroupItem aria-label="Gold" className="flex-1" value="gold">
                Gold
              </ToggleGroupItem>
              <ToggleGroupItem aria-label="Silver" className="flex-1" value="silver">
                Silver
              </ToggleGroupItem>
              <ToggleGroupItem aria-label="Any metal" className="flex-1" value="any">
                Any metal
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Weight</Label>
            <ToggleGroup
              className="w-full"
              onValueChange={(groupValue) => {
                const nextValue = groupValue[0];
                if (!nextValue) return;
                onChange({
                  categoryWeightGroup: nextValue as AlertFormValues["categoryWeightGroup"],
                });
              }}
              value={[values.categoryWeightGroup]}
              variant="outline"
            >
              {categoryWeightGroups.map((group) => (
                <ToggleGroupItem
                  aria-label={categoryWeightGroupControlLabels[group]}
                  className="flex-1"
                  key={group}
                  value={group}
                >
                  {categoryWeightGroupControlLabels[group]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-brand">Brand</Label>
            <Select
              items={Object.fromEntries([
                [anyBrandValue, "Any brand"],
                ...mergedBrandOptions.map((brand) => [brand, brand]),
              ])}
              modal={false}
              onValueChange={(value) => {
                onChange({ brand: value === anyBrandValue ? "" : (value ?? "") });
              }}
              value={values.brand || anyBrandValue}
            >
              <SelectTrigger className="w-full" id="alert-brand">
                <SelectValue />
              </SelectTrigger>
              <SelectContent portal={false}>
                <SelectItem value={anyBrandValue}>Any brand</SelectItem>
                {mergedBrandOptions.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="threshold">
          <div className="space-y-1.5">
            <Label>Metal</Label>
            <ToggleGroup
              className="w-full"
              onValueChange={(groupValue) => {
                const nextValue = groupValue[0];
                if (!nextValue) return;
                onChange({
                  thresholdMetal: nextValue === "any" ? "" : (nextValue as "gold" | "silver"),
                });
              }}
              value={[values.thresholdMetal || "any"]}
              variant="outline"
            >
              <ToggleGroupItem aria-label="Gold" className="flex-1" value="gold">
                Gold
              </ToggleGroupItem>
              <ToggleGroupItem aria-label="Silver" className="flex-1" value="silver">
                Silver
              </ToggleGroupItem>
              <ToggleGroupItem aria-label="Both metals" className="flex-1" value="any">
                Both
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-above-spot">Max Markup (%)</Label>
            <Input
              aria-invalid={
                showValidationErrors &&
                values.formType === "threshold" &&
                !values.aboveSpotThreshold.trim()
              }
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
                aria-invalid={
                  showValidationErrors && values.formType === "sku" && !values.skuProductId
                }
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
            onChange({ cooldownMinutes: Math.trunc(Number(value)) });
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
