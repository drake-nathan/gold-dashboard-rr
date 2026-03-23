export interface ProductForReview {
  _id: string;
  currentInStock: boolean;
  currentPrice: number;
  firstSeen: number;
  matchApprovedAt: null | number | undefined;
  matchApprovedBy: null | string | undefined;
  matchStatus: null | string | undefined;
  metalType: "gold" | "silver";
  metalWeight: null | string;
  name: string;
  productId: string;
  pureProduct: null | {
    currentBidPrice: null | number;
    isGenericFallback: boolean | undefined;
    manufacturer: null | string;
    productName: string;
    pureProductId: string;
    sku: null | string | undefined;
    weight: number;
  };
  pureProductId: null | string | undefined;
  thumbnail: null | string;
  url: string;
}
