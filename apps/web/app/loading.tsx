import NuruShopLoading from "@/components/ui/NuruShopLoading";

/** Fallback for non-storefront routes that do not define a more specific loader. */
export default function RootLoading() {
  return <NuruShopLoading variant="page" />;
}
