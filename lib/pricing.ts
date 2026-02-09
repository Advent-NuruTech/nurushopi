export interface PriceFields {
  price?: number;
  sellingPrice?: number;
  originalPrice?: number;
}

export const getSellingPrice = (priceFields: PriceFields): number => {
  const value = priceFields.sellingPrice ?? priceFields.price ?? 0;
  return Number.isFinite(value) ? value : 0;
};

export const getOriginalPrice = (priceFields: PriceFields): number | null => {
  const value = priceFields.originalPrice;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
};

export const getDiscountPercent = (priceFields: PriceFields): number | null => {
  const selling = getSellingPrice(priceFields);
  const original = getOriginalPrice(priceFields);
  if (!original || original <= selling) return null;
  return Math.round(((original - selling) / original) * 100);
};

export const hasDiscount = (priceFields: PriceFields): boolean => {
  return getDiscountPercent(priceFields) !== null;
};
