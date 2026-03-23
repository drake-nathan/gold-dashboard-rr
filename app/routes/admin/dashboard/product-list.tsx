import { CheckCircle2, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { ProductMatchCard } from "../match-card";
import type { AdminProductsForReviewStatus } from "./types";

export const ProductList = ({
  products,
}: {
  products: AdminProductsForReviewStatus | undefined;
}) => {
  if (!products) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">No products in this tab</p>
        </CardContent>
      </Card>
    );
  }

  return products.map((product) => <ProductMatchCard key={product.productId} product={product} />);
};
