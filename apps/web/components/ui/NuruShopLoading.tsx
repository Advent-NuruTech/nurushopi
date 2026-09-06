import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";

type NuruShopLoadingProps = {
  /** Use the product-card layout when a storefront catalogue is loading. */
  variant?: "catalogue" | "page";
  cards?: number;
};

/**
 * A deterministic loading state for route transitions and streamed storefront data.
 * Keep this server-renderable: loading UI must be safe before hydration finishes.
 */
export default function NuruShopLoading({
  variant = "catalogue",
  cards = 8,
}: NuruShopLoadingProps) {
  if (variant === "page") {
    return (
      <section className="mx-auto flex min-h-[45vh] max-w-lg flex-col items-center justify-center px-4 text-center" role="status" aria-live="polite">
        <div className="nurushop-skeleton mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
          <span className="text-[10px] font-extrabold tracking-[0.12em] text-slate-400 dark:text-slate-600">NURU</span>
        </div>
        <p className="font-semibold text-brand-strong dark:text-brand-bright">NuruShop is loading</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Getting everything ready for you…</p>
      </section>
    );
  }

  return (
    <section className="py-5 sm:py-8" role="status" aria-live="polite" aria-label="Loading NuruShop products">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="nurushop-skeleton h-6 w-40 rounded-full" />
          <div className="nurushop-skeleton h-3 w-56 max-w-[70vw] rounded-full" />
        </div>
        <span className="hidden text-xs font-semibold tracking-wide text-brand-strong sm:block">NURUSHOP</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, index) => <ProductCardSkeleton key={index} />)}
      </div>
      <span className="sr-only">Loading NuruShop products</span>
    </section>
  );
}
