/**
 * Format numeric price into Kenyan Shilling format
 * @example formatPrice(1200) -> "KSh 1,200.00"
 */
export const formatPrice = (amount: number): string => {
  if (!amount) return "KSh 0.00";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(amount);
};
