"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, PauseCircle, PlayCircle, Search, ShoppingBag, Tag, Trash2 } from "lucide-react";
import type {
  AdminPromotionDTO,
  CollectionMembershipDTO,
  MerchandisingCollectionDTO,
  ProductDTO,
} from "@nuru/types";
import { ApiClientError, catalogApi, merchandisingApi } from "@/lib/api";
import { formatPrice } from "@/lib/formatPrice";
import PromotionCountdown from "@/components/merchandising/PromotionCountdown";

function localDateTime(value: Date | string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function permanentKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 54);
}

export default function MerchandisingAssignments({
  actor,
  collections,
}: {
  actor: "admin" | "vendor";
  collections: MerchandisingCollectionDTO[];
}) {
  const [collectionId, setCollectionId] = useState("");
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [memberships, setMemberships] = useState<CollectionMembershipDTO[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [promotions, setPromotions] = useState<AdminPromotionDTO[]>([]);
  const [customerPrices, setCustomerPrices] = useState<Record<string, string>>({});
  const [campaignName, setCampaignName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    if (!collectionId && collections[0]) setCollectionId(collections[0].id);
  }, [collectionId, collections]);

  const load = useCallback(async () => {
    if (!collectionId) return;
    setLoading(true);
    setMessage("");
    try {
      const [productPage, membershipData, promotionData] = await Promise.all([
        actor === "admin"
          ? catalogApi.admin.listProducts({ pageSize: 100 })
          : catalogApi.vendor.listProducts({ pageSize: 100 }),
        actor === "admin"
          ? merchandisingApi.admin.memberships(collectionId)
          : merchandisingApi.vendor.memberships(collectionId),
        actor === "admin"
          ? merchandisingApi.admin.promotions(collectionId)
          : Promise.resolve({ promotions: [] as AdminPromotionDTO[] }),
      ]);
      setProducts(productPage.items);
      setMemberships(membershipData.memberships);
      setPromotions(promotionData.promotions);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load collection products.");
    } finally {
      setLoading(false);
    }
  }, [actor, collectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const collection = collections.find((item) => item.id === collectionId);
    if (!collection || actor !== "admin") return;
    const now = new Date();
    const collectionStart = collection.startAt ? new Date(collection.startAt) : null;
    const collectionEnd = collection.endAt ? new Date(collection.endAt) : null;
    setCampaignName(`${collection.displayName} offer`);
    setStartsAt(localDateTime(collectionStart && collectionStart > now ? collectionStart : now));
    setEndsAt(
      localDateTime(
        collectionEnd && collectionEnd > now
          ? collectionEnd
          : new Date(now.getTime() + 24 * 60 * 60 * 1000),
      ),
    );
    setCustomerPrices({});
  }, [actor, collectionId, collections]);

  const assignedIds = useMemo(
    () => new Set(memberships.map((item) => item.productId)),
    [memberships],
  );
  const available = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        !assignedIds.has(product.id) &&
        (!query ||
          product.name.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query)),
    );
  }, [assignedIds, products, search]);

  async function addSelected() {
    if (!collectionId || selected.length === 0) return;
    setLoading(true);
    setMessage("");
    try {
      const input = {
        items: selected.map((productId) => ({ productId, source: "MANUAL" as const, score: 0 })),
      };
      const result =
        actor === "admin"
          ? await merchandisingApi.admin.importMemberships(collectionId, input)
          : await merchandisingApi.vendor.importMemberships(collectionId, input);
      setMessage(
        `${result.imported} product${result.imported === 1 ? "" : "s"} added to ${result.collectionKey}.`,
      );
      setSelected([]);
      await load();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Could not add products.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function importCurrentProducts() {
    if (!collectionId) return;
    setLoading(true);
    setMessage("");
    try {
      const result =
        actor === "admin"
          ? await merchandisingApi.admin.importCurrentProducts(collectionId)
          : await merchandisingApi.vendor.importCurrentProducts(collectionId);
      setMessage(
        result.imported > 0
          ? `Imported ${result.imported} current product${result.imported === 1 ? "" : "s"}. ${result.eligible} active products are now eligible for this collection.`
          : `All ${result.eligible} current active products are already in this collection.`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import current products.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(productId: string) {
    setLoading(true);
    try {
      if (actor === "admin") await merchandisingApi.admin.removeMembership(collectionId, productId);
      else await merchandisingApi.vendor.removeMembership(collectionId, productId);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove product.");
    } finally {
      setLoading(false);
    }
  }

  async function createCustomerOffer() {
    if (!collectionId) return;
    const pricedProducts = memberships.flatMap((membership) => {
      const raw = customerPrices[membership.productId]?.trim();
      if (!raw) return [];
      const promotionalPrice = Number(raw);
      const basePrice = Number(membership.product.sellingPrice ?? membership.product.price);
      return Number.isFinite(promotionalPrice) &&
        promotionalPrice >= 0 &&
        promotionalPrice < basePrice
        ? [{ productId: membership.productId, promotionalPrice }]
        : [];
    });
    const enteredCount = Object.values(customerPrices).filter((value) => value.trim()).length;
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (
      !campaignName.trim() ||
      pricedProducts.length === 0 ||
      pricedProducts.length !== enteredCount
    ) {
      setMessage("Add a valid customer price below the current price for at least one product.");
      return;
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setMessage("Choose an offer end time that is after its start time.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const keyBase = permanentKey(campaignName) || "customer_offer";
      const keySuffix = `${start.getTime().toString(36)}_${Date.now().toString(36)}`;
      await merchandisingApi.admin.createPromotion({
        key: `${keyBase}_${keySuffix}`.slice(0, 80),
        name: campaignName.trim(),
        status: start.getTime() > Date.now() ? "SCHEDULED" : "ACTIVE",
        discountType: "FIXED_PRICE",
        discountValue: Math.min(...pricedProducts.map((item) => item.promotionalPrice)),
        fundingType: "PLATFORM",
        collectionId,
        startsAt: start,
        endsAt: end,
        products: pricedProducts,
      });
      setCustomerPrices({});
      setMessage(
        start.getTime() > Date.now()
          ? `Offer scheduled for ${pricedProducts.length} product${pricedProducts.length === 1 ? "" : "s"}.`
          : `Customer pricing is live on ${pricedProducts.length} product${pricedProducts.length === 1 ? "" : "s"}.`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save customer pricing.");
    } finally {
      setLoading(false);
    }
  }

  async function changePromotionStatus(promotion: AdminPromotionDTO) {
    setLoading(true);
    setMessage("");
    try {
      const status = promotion.status === "PAUSED" ? "ACTIVE" : "PAUSED";
      await merchandisingApi.admin.updatePromotionStatus(promotion.id, { status });
      setMessage(status === "PAUSED" ? "Offer paused." : "Offer resumed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the offer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h3 className="font-bold">Collection products</h3>
        <p className="mt-1 text-sm text-slate-500">
          Import every current active product at once, or select individual products below.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Collection
          </label>
          <select
            value={collectionId}
            onChange={(event) => {
              setCollectionId(event.target.value);
              setSelected([]);
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          >
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.displayName} ({collection.key})
              </option>
            ))}
          </select>
        </div>
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute left-3 top-9 text-slate-400" />
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Find inventory
          </label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or SKU"
            className="mt-1 w-full rounded-xl border py-2 pl-9 pr-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void importCurrentProducts()}
            disabled={loading || !collectionId}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-4 py-2 font-semibold text-brand-ink hover:bg-brand-surface-strong disabled:opacity-50 dark:border-brand-strong dark:bg-[#063D1E] dark:text-brand-bright"
          >
            <Download size={16} /> Import current products
          </button>
          <button
            type="button"
            onClick={() => void addSelected()}
            disabled={loading || selected.length === 0}
            className="rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            Add selected ({selected.length})
          </button>
        </div>
      </div>
      {message && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {message}
        </p>
      )}
      {actor === "admin" && (
        <div className="mt-4 rounded-2xl border border-brand-border bg-brand-surface p-4 dark:border-brand-strong dark:bg-[#063D1E]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 font-bold text-brand-ink dark:text-brand-bright">
                <Tag size={16} /> Customer pricing
              </h4>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Enter a special price beside any assigned product, then set one clear sales window.
                Checkout verifies the same price and expiry on the server.
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-strong shadow-sm dark:bg-slate-900 dark:text-brand-bright">
              {Object.values(customerPrices).filter((value) => value.trim()).length} priced
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2 dark:text-slate-300">
              Offer name
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                className="field-control bg-white dark:bg-slate-950"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Starts
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="field-control bg-white dark:bg-slate-950"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Ends
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="field-control bg-white dark:bg-slate-950"
              />
            </label>
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 font-semibold">Available retail products</h4>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {available.map((product) => (
              <label
                key={product.id}
                className="flex items-center gap-3 rounded-xl border p-3 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(product.id)}
                  onChange={() =>
                    setSelected((ids) =>
                      ids.includes(product.id)
                        ? ids.filter((id) => id !== product.id)
                        : [...ids, product.id],
                    )
                  }
                />
                <ShoppingBag size={16} className="text-brand-strong" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{product.name}</span>
                <code className="text-[10px] text-slate-400">{product.sku ?? "no SKU"}</code>
              </label>
            ))}
            {!loading && available.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950">
                No matching unassigned products.
              </p>
            )}
          </div>
        </div>
        <div>
          <h4 className="mb-2 font-semibold">Currently assigned ({memberships.length})</h4>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 dark:border-slate-700"
              >
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                  #{membership.rank ?? "–"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {membership.product.name}
                </span>
                <div className="flex items-center gap-2">
                  {actor === "admin" && (
                    <label className="text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Customer price
                      <span className="mt-0.5 flex items-center rounded-lg border bg-white px-2 focus-within:border-brand dark:border-slate-700 dark:bg-slate-950">
                        <span className="text-xs normal-case text-slate-400">KSh</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          max={Number(membership.product.sellingPrice ?? membership.product.price)}
                          value={customerPrices[membership.productId] ?? ""}
                          onChange={(event) =>
                            setCustomerPrices((current) => ({
                              ...current,
                              [membership.productId]: event.target.value,
                            }))
                          }
                          placeholder={formatPrice(
                            Number(membership.product.sellingPrice ?? membership.product.price),
                          ).replace(/^KSh\s*/, "")}
                          className="w-20 bg-transparent px-1 py-1.5 text-right text-sm font-semibold outline-none"
                          aria-label={`Customer price for ${membership.product.name}`}
                        />
                      </span>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(membership.productId)}
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                    aria-label={`Remove ${membership.product.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {!loading && memberships.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950">
                Nothing assigned yet.
              </p>
            )}
          </div>
          {actor === "admin" && memberships.length > 0 && (
            <button
              type="button"
              onClick={() => void createCustomerOffer()}
              disabled={loading || !Object.values(customerPrices).some((value) => value.trim())}
              className="mt-3 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-50"
            >
              Save prices and schedule offer
            </button>
          )}
        </div>
      </div>
      {actor === "admin" && promotions.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <h4 className="font-semibold">Saved offers</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {promotions.map((promotion) => {
              const ended = promotion.status === "ARCHIVED";
              const paused = promotion.status === "PAUSED";
              return (
                <article
                  key={promotion.id}
                  className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{promotion.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {promotion.products.length} product
                        {promotion.products.length === 1 ? "" : "s"}
                        {" · "}
                        {paused
                          ? "Paused"
                          : ended
                            ? "Ended"
                            : promotion.status === "SCHEDULED"
                              ? "Scheduled"
                              : "Live"}
                      </p>
                    </div>
                    {!ended && (
                      <button
                        type="button"
                        onClick={() => void changePromotionStatus(promotion)}
                        disabled={loading}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold hover:border-brand-border hover:text-brand-strong disabled:opacity-50 dark:border-slate-700"
                      >
                        {paused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                        {paused ? "Resume" : "Pause"}
                      </button>
                    )}
                  </div>
                  {!paused && !ended && (
                    <span className="mt-2 inline-flex rounded-full bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      <PromotionCountdown endsAt={promotion.endsAt} />
                    </span>
                  )}
                  <div className="mt-2 space-y-1">
                    {promotion.products.slice(0, 3).map((item) => (
                      <p
                        key={item.id}
                        className="flex justify-between gap-3 text-xs text-slate-500"
                      >
                        <span className="truncate">{item.product.name}</span>
                        <span className="shrink-0 font-bold text-brand-strong dark:text-brand-bright">
                          {formatPrice(Number(item.promotionalPrice ?? promotion.discountValue))}
                        </span>
                      </p>
                    ))}
                    {promotion.products.length > 3 && (
                      <p className="text-xs text-slate-400">
                        +{promotion.products.length - 3} more
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
