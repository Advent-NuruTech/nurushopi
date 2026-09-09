/** Keep post-auth navigation inside this storefront. */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
