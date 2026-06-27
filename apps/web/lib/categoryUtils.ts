/**
 * Converts category name to safe slug
 * Used everywhere: upload, edit, API, dashboard
 */
export function slugifyCategory(value: string): string {
  if (!value) return "";

  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Converts slug back to readable label
 * Used in product cards & filters
 */
export function formatCategoryLabel(slug: string): string {
  if (!slug) return "Uncategorized";

  const normalized = slug.replace(/-/g, " ").trim();
  if (!normalized) return "Uncategorized";

  // special cases
  if (/^egw$/i.test(normalized)) return "E.G. White Writings";

  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}
