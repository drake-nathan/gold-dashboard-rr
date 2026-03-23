import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AlertFormType, AlertFormValues, ProductOption } from "./types";

export const AlertFormFields = ({
  onChange,
  productOptions,
  values,
}: {
  onChange: (update: Partial<AlertFormValues>) => void;
  productOptions: ProductOption[];
  values: AlertFormValues;
}) => (
  <>
    <div className="space-y-1.5">
      <Label htmlFor="alert-name">Name</Label>
      <Input
        id="alert-name"
        onChange={(event) => {
          onChange({ name: event.target.value });
        }}
        placeholder="Deal watcher"
        value={values.name}
      />
    </div>

    <div className="space-y-1.5">
      <Label htmlFor="alert-type">Alert Type</Label>
      <Select
        onValueChange={(value) => {
          onChange({ formType: value as AlertFormType });
        }}
        value={values.formType}
      >
        <SelectTrigger id="alert-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="threshold">Threshold</SelectItem>
          <SelectItem value="sku">Specific Product (SKU)</SelectItem>
          <SelectItem value="category">Category</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {values.formType === "sku" ? (
      <>
        <div className="space-y-1.5">
          <Label htmlFor="alert-product">Product</Label>
          <Select
            onValueChange={(value) => {
              onChange({ skuProductId: value });
            }}
            value={values.skuProductId || undefined}
          >
            <SelectTrigger id="alert-product">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {productOptions.map((product) => (
                <SelectItem key={product.productId} value={product.productId}>
                  {product.name} ({product.metalType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="alert-sku-trigger">Trigger On</Label>
          <Select
            onValueChange={(value) => {
              onChange({
                skuTriggerOn: value as "in_stock" | "price_drop",
              });
            }}
            value={values.skuTriggerOn}
          >
            <SelectTrigger id="alert-sku-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_stock">Back in stock</SelectItem>
              <SelectItem value="price_drop">Price drop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    ) : null}

    {values.formType === "category" ? (
      <>
        <div className="space-y-1.5">
          <Label htmlFor="alert-category-trigger">Trigger On</Label>
          <Select
            onValueChange={(value) => {
              onChange({
                categoryTriggerOn: value as "in_stock" | "price_drop",
              });
            }}
            value={values.categoryTriggerOn}
          >
            <SelectTrigger id="alert-category-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_stock">Back in stock</SelectItem>
              <SelectItem value="price_drop">Price drop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="alert-metal">Metal</Label>
          <Select
            onValueChange={(value) => {
              onChange({
                categoryMetal: value === "any" ? "" : (value as "gold" | "silver"),
              });
            }}
            value={values.categoryMetal || "any"}
          >
            <SelectTrigger id="alert-metal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
      </>
    ) : null}

    {values.formType === "threshold" ? (
      <>
        <div className="space-y-1.5">
          <Label htmlFor="alert-above-spot">Above Spot Threshold (%)</Label>
          <Input
            id="alert-above-spot"
            onChange={(event) => {
              onChange({ aboveSpotThreshold: event.target.value });
            }}
            placeholder="Optional (e.g. 0.5)"
            type="number"
            value={values.aboveSpotThreshold}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="alert-profit-threshold">Profit Threshold (USD)</Label>
          <Input
            id="alert-profit-threshold"
            onChange={(event) => {
              onChange({ profitThreshold: event.target.value });
            }}
            placeholder="Optional (e.g. 25)"
            type="number"
            value={values.profitThreshold}
          />
        </div>
      </>
    ) : null}

    <div className="space-y-1.5">
      <Label htmlFor="alert-cooldown">Cooldown (minutes)</Label>
      <Input
        id="alert-cooldown"
        min={1}
        onChange={(event) => {
          const value = Number.parseInt(event.target.value, 10);
          onChange({ cooldownMinutes: Number.isFinite(value) ? value : 60 });
        }}
        type="number"
        value={values.cooldownMinutes}
      />
    </div>
  </>
);
