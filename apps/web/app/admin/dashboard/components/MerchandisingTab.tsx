"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Plus, RefreshCw, Save, Sparkles } from "lucide-react";
import type { MerchandisingCollectionDTO } from "@nuru/types";
import { merchandisingApi, type AdminHomepageSection } from "@/lib/api";

export default function MerchandisingTab() {
  const [collections, setCollections] = useState<MerchandisingCollectionDTO[]>([]);
  const [sections, setSections] = useState<AdminHomepageSection[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newCollection, setNewCollection] = useState({ key: "", displayName: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [collectionData, sectionData] = await Promise.all([
        merchandisingApi.admin.collections(),
        merchandisingApi.admin.sections(),
      ]);
      setCollections(collectionData.collections);
      setSections([...sectionData.sections].sort((a, b) => a.position - b.position));
      setNames(Object.fromEntries(collectionData.collections.map((item) => [item.id, item.displayName])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load merchandising.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sectionByCollection = useMemo(
    () => new Map(sections.map((section) => [section.collectionId, section])),
    [sections],
  );

  async function saveName(collection: MerchandisingCollectionDTO) {
    const displayName = names[collection.id]?.trim();
    if (!displayName || displayName === collection.displayName) return;
    setSaving(collection.id);
    try {
      const { collection: updated } = await merchandisingApi.admin.updateCollection(collection.id, { displayName });
      setCollections((items) => items.map((item) => item.id === updated.id ? updated : item));
      setMessage(`Renamed presentation to “${updated.displayName}”; immutable key ${updated.key} is unchanged.`);
    } finally {
      setSaving(null);
    }
  }

  async function toggleCollection(collection: MerchandisingCollectionDTO) {
    setSaving(collection.id);
    try {
      const status = collection.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const { collection: updated } = await merchandisingApi.admin.updateCollection(collection.id, { status });
      setCollections((items) => items.map((item) => item.id === updated.id ? updated : item));
    } finally {
      setSaving(null);
    }
  }

  async function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!sections[index] || !sections[target]) return;
    const current = sections[index];
    const other = sections[target];
    setSaving(current.id);
    try {
      await Promise.all([
        merchandisingApi.admin.updateSection(current.id, { position: other.position }),
        merchandisingApi.admin.updateSection(other.id, { position: current.position }),
      ]);
      setSections((items) => {
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        return next.map((item, position) => ({ ...item, position }));
      });
    } finally {
      setSaving(null);
    }
  }

  async function createCollection() {
    if (!newCollection.key.trim() || !newCollection.displayName.trim()) return;
    setSaving("new");
    try {
      await merchandisingApi.admin.createCollection({
        key: newCollection.key.trim(),
        displayName: newCollection.displayName.trim(),
        status: "DRAFT",
        collectionType: "generic",
        selectionStrategy: "hybrid",
        priority: 0,
        maxProducts: 24,
        sortStrategy: "rank",
        isPersonalized: false,
        isSponsored: false,
      });
      setNewCollection({ key: "", displayName: "" });
      await load();
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="rounded-2xl border bg-white p-8 dark:border-slate-800 dark:bg-slate-900">Loading merchandising control center…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400"><Sparkles size={16} /> Merchandising platform</p>
          <h2 className="mt-1 text-2xl font-bold">Discovery & homepage orchestration</h2>
          <p className="mt-1 text-sm text-slate-500">Names, rules, ranking and placement remain independent. Keys are permanent.</p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold dark:border-slate-700"><Eye size={16} /> Preview storefront</a>
          <button onClick={() => void load()} className="rounded-xl border p-2 dark:border-slate-700" aria-label="Refresh"><RefreshCw size={17} /></button>
        </div>
      </header>

      {message && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">{message}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-bold">Create a future collection</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
          <input value={newCollection.key} onChange={(e) => setNewCollection((v) => ({ ...v, key: e.target.value }))} placeholder="immutable_key" className="rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <input value={newCollection.displayName} onChange={(e) => setNewCollection((v) => ({ ...v, displayName: e.target.value }))} placeholder="Customer-facing name" className="rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <button onClick={() => void createCollection()} disabled={saving === "new"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} /> Create draft</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {collections.map((collection) => {
          const section = sectionByCollection.get(collection.id);
          return (
            <article key={collection.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Display name</label>
                  <div className="mt-1 flex gap-2">
                    <input value={names[collection.id] ?? collection.displayName} onChange={(e) => setNames((value) => ({ ...value, [collection.id]: e.target.value }))} className="min-w-0 flex-1 rounded-xl border px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-950" />
                    <button onClick={() => void saveName(collection)} disabled={saving === collection.id} className="rounded-xl border p-2 dark:border-slate-700" aria-label="Save display name"><Save size={17} /></button>
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-500">key: {collection.key}</p>
                </div>
                <button onClick={() => void toggleCollection(collection)} className={`rounded-full px-3 py-1 text-xs font-bold ${collection.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{collection.status}</button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950"><b className="block text-base">{collection.maxProducts}</b>max products</div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950"><b className="block text-base">v{collection.cacheVersion}</b>cache version</div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950"><b className="block text-base">{section ? section.position + 1 : "—"}</b>homepage order</div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-bold">Homepage order</h3>
        <div className="mt-3 divide-y dark:divide-slate-800">
          {sections.map((section, index) => (
            <div key={section.id} className="flex items-center gap-3 py-3">
              <span className="w-7 text-center text-sm font-bold text-slate-400">{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="font-semibold">{section.collection.displayName}</p><p className="font-mono text-xs text-slate-500">{section.collection.key} · {section.device}</p></div>
              <button onClick={() => void moveSection(index, -1)} disabled={index === 0 || saving === section.id} className="rounded-lg border p-2 disabled:opacity-30 dark:border-slate-700" aria-label="Move up"><ArrowUp size={15} /></button>
              <button onClick={() => void moveSection(index, 1)} disabled={index === sections.length - 1 || saving === section.id} className="rounded-lg border p-2 disabled:opacity-30 dark:border-slate-700" aria-label="Move down"><ArrowDown size={15} /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

