"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  HERO_DEFAULT_GRADIENT,
  HERO_GRADIENT_PRESETS,
  resolveHeroGradient,
} from "@/lib/heroGradients";

type HeroItem = {
  id: string;
  text: string;
  gradient: string;
  order: number;
  isActive: boolean;
};

type NewHeroItem = {
  text: string;
  gradient: string;
};

const DEFAULT_NEW_ITEM: NewHeroItem = {
  text: "",
  gradient: HERO_DEFAULT_GRADIENT,
};

export default function HeroTab() {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState<NewHeroItem>(DEFAULT_NEW_ITEM);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items]
  );

  const loadItems = () => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/hero", { credentials: "include" })
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          items?: HeroItem[];
          error?: string;
        };
        if (!r.ok) throw new Error(payload.error || "Failed to load hero items");
        setItems(payload.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load hero items"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const saveItem = async (item: HeroItem) => {
    setSavingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/hero", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to save item");
      setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save item");
    } finally {
      setSavingId(null);
    }
  };

  const createItem = async () => {
    const text = newItem.text.trim();
    if (!text) {
      setError("Announcement text is required.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          gradient: resolveHeroGradient(newItem.gradient),
          order: items.length,
          isActive: true,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to create item");
      setNewItem(DEFAULT_NEW_ITEM);
      loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create item");
    } finally {
      setCreating(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm("Delete this hero announcement?")) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hero?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to delete item");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading hero announcements..." />;

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hero Announcements & Colors</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Senior admins can manage the marquee text and gradient colors shown in Hero section.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Total items: {items.length}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Add New Item</h3>
        <textarea
          value={newItem.text}
          onChange={(e) => setNewItem((prev) => ({ ...prev, text: e.target.value }))}
          rows={3}
          placeholder="Announcement text..."
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        />
        <select
          value={newItem.gradient}
          onChange={(e) => setNewItem((prev) => ({ ...prev, gradient: e.target.value }))}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        >
          {HERO_GRADIENT_PRESETS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={createItem}
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-60"
        >
          {creating ? "Adding..." : "Add Hero Item"}
        </button>
      </div>

      <div className="space-y-3">
        {sortedItems.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3"
          >
            <textarea
              value={item.text}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((x) =>
                    x.id === item.id ? { ...x, text: e.target.value } : x
                  )
                )
              }
              rows={2}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={item.gradient}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === item.id ? { ...x, gradient: e.target.value } : x
                    )
                  )
                }
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {HERO_GRADIENT_PRESETS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={item.order}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === item.id ? { ...x, order: Number(e.target.value) } : x
                    )
                  )
                }
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={item.isActive}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, isActive: e.target.checked } : x
                      )
                    )
                  }
                />
                Active
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveItem(item)}
                disabled={savingId === item.id}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {savingId === item.id ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={savingId === item.id}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {sortedItems.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No hero announcements yet. Add your first item above.
          </p>
        )}
      </div>
    </section>
  );
}
