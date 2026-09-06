/**
 * Format a numeric price into the canonical NuruShop Kenyan Shilling format.
 *
 * This deliberately avoids `Intl.NumberFormat` because currency-display data
 * can differ between the Node and browser ICU runtimes (for example `Ksh` vs
 * `KES`), which causes hydration errors in server-rendered components.
 *
 * @example formatPrice(1200) -> "KSh 1,200.00"
 */
export const formatPrice = (amount: number): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = value < 0 ? "-" : "";

  return `${sign}KSh ${groupedWhole}.${fraction}`;
};
