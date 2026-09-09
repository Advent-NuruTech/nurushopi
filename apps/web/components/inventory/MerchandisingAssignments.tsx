"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, ShoppingBag, Trash2 } from "lucide-react";
import type { CollectionMembershipDTO, MerchandisingCollectionDTO, ProductDTO } from "@nuru/types";
import { ApiClientError, catalogApi, merchandisingApi } from "@/lib/api";

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

  useEffect(() => {
    if (!collectionId && collections[0]) setCollectionId(collections[0].id);
  }, [collectionId, collections]);

  const load = useCallback(async () => {
    if (!collectionId) return;
    setLoading(true);
    setMessage("");
    try {
      const [productPage, membershipData] = await Promise.all([
        actor === "admin"
          ? catalogApi.admin.listProducts({ pageSize: 100 })
          : catalogApi.vendor.listProducts({ pageSize: 100 }),
        actor === "admin"
          ? merchandisingApi.admin.memberships(collectionId)
          : merchandisingApi.vendor.memberships(collectionId),
      ]);
      setProducts(productPage.items);
      setMemberships(membershipData.memberships);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load collection products.");
    } finally {
      setLoading(false);
    }
  }, [actor, collectionId]);

  useEffect(() => {
    void load();
  }, [load]);

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
                className="flex items-center gap-3 rounded-xl border p-3 dark:border-slate-700"
              >
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                  #{membership.rank ?? "–"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {membership.product.name}
                </span>
                <button
                  type="button"
                  onClick={() => void remove(membership.productId)}
                  className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                  aria-label={`Remove ${membership.product.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!loading && memberships.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950">
                Nothing assigned yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
