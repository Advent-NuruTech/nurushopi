const DEFAULT_DESCRIPTION = "Discover this item at NuruShop.";

/** Plain, compact copy for share sheets and social preview metadata. */
export function shareDescription(
  value: string | null | undefined,
  fallback = DEFAULT_DESCRIPTION,
  maxLength = 160,
): string {
  const clean = (value || fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/\*\*|__|`/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function shareMessage(title: string, description: string): string {
  return `${title}\n${shareDescription(description)}`;
}
