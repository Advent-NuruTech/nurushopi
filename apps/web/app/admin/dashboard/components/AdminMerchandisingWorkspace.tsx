"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Eye,
  FilePenLine,
  PauseCircle,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { CollectionUpdateInput, MerchandisingCollectionDTO } from "@nuru/types";
import { merchandisingApi, type AdminHomepageSection } from "@/lib/api";
import MerchandisingAssignments from "@/components/inventory/MerchandisingAssignments";

const HOMEPAGE_SLOTS = 12;

type CollectionDraft = {
  displayName: string;
  description: string;
  badgeText: string;
  ctaText: string;
  imageUrl: string;
  maxProducts: number;
  startAt: string;
  endAt: string;
};

type NewCollectionDraft = CollectionDraft & {
  template: string;
  key: string;
  collectionType: string;
  selectionStrategy: string;
};

const TEMPLATES: Array<{
  id: string;
  name: string;
  summary: string;
  values: Omit<NewCollectionDraft, "template" | "key" | "startAt" | "endAt" | "imageUrl">;
}> = [
  {
    id: "new_arrivals",
    name: "New arrivals",
    summary: "A ready-to-edit launch for the newest products.",
    values: {
      displayName: "Fresh finds",
      description: "Discover the newest products to arrive at NuruShop.",
      badgeText: "Just in",
      ctaText: "Shop new arrivals",
      maxProducts: 24,
      collectionType: "new_arrivals",
      selectionStrategy: "hybrid",
    },
  },
  {
    id: "seasonal",
    name: "Seasonal campaign",
    summary: "A flexible future campaign with dates and a clear call to action.",
    values: {
      displayName: "Seasonal favourites",
      description: "Timely picks selected for this season.",
      badgeText: "Seasonal",
      ctaText: "Explore the edit",
      maxProducts: 24,
      collectionType: "seasonal",
      selectionStrategy: "manual",
    },
  },
  {
    id: "flash_sale",
    name: "Limited-time offer",
    summary: "A campaign template for a promotion or short sales window.",
    values: {
      displayName: "Nuru Rush",
      description: "Limited-time value on products customers love.",
      badgeText: "Limited time",
      ctaText: "Shop the offer",
      maxProducts: 16,
      collectionType: "flash_sale",
      selectionStrategy: "promotion",
    },
  },
  {
    id: "curated",
    name: "Curated collection",
    summary: "A general-purpose collection for hand-picked products.",
    values: {
      displayName: "Nuru picks",
      description: "A considered selection chosen by the NuruShop team.",
      badgeText: "Hand-picked",
      ctaText: "Explore collection",
      maxProducts: 24,
      collectionType: "spotlight",
      selectionStrategy: "manual",
    },
  },
];

function slugKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function dateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toDraft(collection: MerchandisingCollectionDTO): CollectionDraft {
  return {
    displayName: collection.displayName,
    description: collection.description ?? "",
    badgeText: collection.badgeText ?? "",
    ctaText: collection.ctaText ?? "",
    imageUrl: collection.imageUrl ?? "",
    maxProducts: collection.maxProducts,
    startAt: dateTimeLocal(collection.startAt),
    endAt: dateTimeLocal(collection.endAt),
  };
}

function toPatch(draft: CollectionDraft): CollectionUpdateInput {
  return {
    displayName: draft.displayName.trim(),
    description: draft.description.trim() || null,
    badgeText: draft.badgeText.trim() || null,
    ctaText: draft.ctaText.trim() || null,
    imageUrl: draft.imageUrl.trim() || null,
    maxProducts: draft.maxProducts,
    startAt: draft.startAt ? new Date(draft.startAt) : null,
    endAt: draft.endAt ? new Date(draft.endAt) : null,
  };
}

function emptyNewCollection(): NewCollectionDraft {
  const template = TEMPLATES[0];
  return {
    template: template.id,
    key: "",
    imageUrl: "",
    startAt: "",
    endAt: "",
    ...template.values,
  };
}

function statusLabel(status: MerchandisingCollectionDTO["status"]) {
  if (status === "ACTIVE") return "Live";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "PAUSED") return "Unpublished";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

export default function AdminMerchandisingWorkspace() {
  const [collections, setCollections] = useState<MerchandisingCollectionDTO[]>([]);
  const [sections, setSections] = useState<AdminHomepageSection[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CollectionDraft>>({});
  const [newCollection, setNewCollection] = useState<NewCollectionDraft>(emptyNewCollection);
  const [placementChoice, setPlacementChoice] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [collectionData, sectionData] = await Promise.all([
        merchandisingApi.admin.collections(),
        merchandisingApi.admin.sections(),
      ]);
      const ordered = [...sectionData.sections].sort(
        (a, b) => a.position - b.position || a.id.localeCompare(b.id),
      );
      setCollections(collectionData.collections);
      setSections(ordered);
      setDrafts(
        Object.fromEntries(
          collectionData.collections.map((collection) => [collection.id, toDraft(collection)]),
        ),
      );
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load merchandising.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sectionByCollection = useMemo(
    () => new Map(sections.map((section) => [section.collectionId, section])),
    [sections],
  );
  const placedIds = useMemo(
    () => new Set(sections.map((section) => section.collectionId)),
    [sections],
  );
  const unplacedCollections = collections.filter((collection) => !placedIds.has(collection.id));
  const slotCount = Math.max(
    HOMEPAGE_SLOTS,
    sections.reduce((highest, section) => Math.max(highest, section.position + 1), 0),
  );
  const slots = Array.from({ length: slotCount }, (_, position) =>
    sections.find((section) => section.position === position),
  );

  function updateDraft(id: string, change: Partial<CollectionDraft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...change } }));
  }

  function chooseTemplate(templateId: string) {
    const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
    setNewCollection((current) => ({
      ...current,
      ...template.values,
      template: template.id,
      key: `${template.id}_${new Date().getFullYear()}`,
    }));
  }

  async function createWorkspace() {
    const key = slugKey(newCollection.key || newCollection.displayName);
    if (!key || !newCollection.displayName.trim()) {
      setMessageTone("error");
      setMessage("Add a collection name and permanent key before creating the draft.");
      return;
    }
    setSaving("new");
    setMessage("");
    try {
      const used = new Set(sections.map((section) => section.position));
      let position = 0;
      while (used.has(position)) position += 1;
      await merchandisingApi.admin.createWorkspace({
        collection: {
          key,
          displayName: newCollection.displayName.trim(),
          description: newCollection.description.trim() || null,
          badgeText: newCollection.badgeText.trim() || null,
          ctaText: newCollection.ctaText.trim() || null,
          imageUrl: newCollection.imageUrl.trim() || null,
          startAt: newCollection.startAt ? new Date(newCollection.startAt) : null,
          endAt: newCollection.endAt ? new Date(newCollection.endAt) : null,
          status: "DRAFT",
          collectionType: newCollection.collectionType,
          selectionStrategy: newCollection.selectionStrategy,
          priority: 0,
          maxProducts: newCollection.maxProducts,
          sortStrategy: "rank",
          isPersonalized: false,
          isSponsored: false,
        },
        homepage: { position, device: "all", configuration: { layout: "card" } },
      });
      setNewCollection(emptyNewCollection());
      setMessageTone("success");
      setMessage("Draft created with a homepage slot. Import products, review it, then publish.");
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not create the collection draft.");
    } finally {
      setSaving(null);
    }
  }

  async function lifecycle(
    collection: MerchandisingCollectionDTO,
    action: "SAVE_DRAFT" | "PUBLISH" | "UNPUBLISH",
  ) {
    const draft = drafts[collection.id];
    if (action !== "UNPUBLISH" && !draft?.displayName.trim()) return;
    setSaving(collection.id);
    setMessage("");
    try {
      const result = await merchandisingApi.admin.lifecycle(collection.id, {
        action,
        collection: action === "UNPUBLISH" ? undefined : toPatch(draft),
      });
      setMessageTone("success");
      setMessage(
        action === "SAVE_DRAFT"
          ? `Saved “${result.collection.displayName}” as a draft.`
          : action === "UNPUBLISH"
            ? `Unpublished “${result.collection.displayName}”. It remains editable.`
            : result.status === "SCHEDULED"
              ? `Scheduled “${result.collection.displayName}” for its start date.`
              : `Published “${result.collection.displayName}” to the storefront.`,
      );
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not change collection status.");
    } finally {
      setSaving(null);
    }
  }

  async function placeCollection(position: number) {
    const collectionId = placementChoice[position] || unplacedCollections[0]?.id;
    const collection = collections.find((item) => item.id === collectionId);
    if (!collection) return;
    setSaving(`slot-${position}`);
    try {
      await merchandisingApi.admin.createSection({
        collectionId,
        position,
        status: "DRAFT",
        device: "all",
        startAt: collection.startAt ? new Date(collection.startAt) : null,
        endAt: collection.endAt ? new Date(collection.endAt) : null,
        configuration: { layout: "card" },
      });
      setMessageTone("success");
      setMessage(`Added “${collection.displayName}” to homepage slot ${position + 1} as a draft.`);
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not add the homepage placement.");
    } finally {
      setSaving(null);
    }
  }

  async function moveSection(section: AdminHomepageSection, direction: -1 | 1) {
    const index = sections.findIndex((item) => item.id === section.id);
    const other = sections[index + direction];
    if (!other) return;
    setSaving(section.id);
    try {
      const reordered = [...sections];
      [reordered[index], reordered[index + direction]] = [
        reordered[index + direction],
        reordered[index],
      ];
      const result = await merchandisingApi.admin.reorderSections({
        sectionIds: reordered.map((item) => item.id),
      });
      setSections(result.sections);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not reorder homepage sections.");
    } finally {
      setSaving(null);
    }
  }

  if (loading && collections.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        Loading merchandising control center…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-strong dark:text-brand-bright">
            <Sparkles size={16} /> Merchandising workspace
          </p>
          <h2 className="mt-1 text-2xl font-bold">Build, preview and publish the homepage</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Start from a template, import existing products, arrange the collection card, and
            preview every draft before customers see it.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold dark:border-slate-700"
          >
            <Eye size={16} /> Open live storefront
          </a>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border p-2 dark:border-slate-700"
            aria-label="Refresh merchandising"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      {message && (
        <p
          role={messageTone === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm ${messageTone === "error" ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" : "bg-brand-surface text-brand-ink dark:bg-[#063D1E] dark:text-brand-surface-strong"}`}
        >
          {message}
        </p>
      )}

      <CreateCollectionPanel
        value={newCollection}
        saving={saving === "new"}
        onChange={setNewCollection}
        onChooseTemplate={chooseTemplate}
        onCreate={() => void createWorkspace()}
      />

      <DraftPreview sections={sections} drafts={drafts} />

      <section className="grid gap-4 lg:grid-cols-2">
        {collections.map((collection) => (
          <CollectionEditor
            key={collection.id}
            collection={collection}
            draft={drafts[collection.id] ?? toDraft(collection)}
            section={sectionByCollection.get(collection.id)}
            saving={saving === collection.id}
            onChange={(change) => updateDraft(collection.id, change)}
            onLifecycle={(action) => void lifecycle(collection, action)}
          />
        ))}
      </section>

      <HomepageOrder
        slots={slots}
        sections={sections}
        drafts={drafts}
        unplacedCollections={unplacedCollections}
        placementChoice={placementChoice}
        saving={saving}
        onChoice={(position, value) =>
          setPlacementChoice((current) => ({ ...current, [position]: value }))
        }
        onPlace={(position) => void placeCollection(position)}
        onMove={(section, direction) => void moveSection(section, direction)}
      />

      <MerchandisingAssignments actor="admin" collections={collections} />
    </div>
  );
}

function CreateCollectionPanel({
  value,
  saving,
  onChange,
  onChooseTemplate,
  onCreate,
}: {
  value: NewCollectionDraft;
  saving: boolean;
  onChange: (value: NewCollectionDraft) => void;
  onChooseTemplate: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Create a future collection</h3>
          <p className="mt-1 text-sm text-slate-500">
            Templates include customer copy and sensible defaults. Edit only what is different.
          </p>
        </div>
        <span className="rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand-strong">
          Always starts as draft
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onChooseTemplate(template.id)}
            className={`rounded-2xl border p-4 text-left transition ${value.template === template.id ? "border-brand bg-brand-surface ring-2 ring-brand/10" : "border-slate-200 hover:border-brand-border dark:border-slate-700"}`}
          >
            <span className="font-semibold">{template.name}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{template.summary}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Customer-facing name">
          <input
            value={value.displayName}
            onChange={(event) => onChange({ ...value, displayName: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Permanent key">
          <input
            value={value.key}
            onChange={(event) => onChange({ ...value, key: slugKey(event.target.value) })}
            placeholder={slugKey(value.displayName) || "seasonal_favourites_2026"}
            className="field-control font-mono"
          />
        </Field>
        <Field label="Starts (optional)">
          <input
            type="datetime-local"
            value={value.startAt}
            onChange={(event) => onChange({ ...value, startAt: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Ends (optional)">
          <input
            type="datetime-local"
            value={value.endAt}
            onChange={(event) => onChange({ ...value, endAt: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <textarea
            rows={2}
            value={value.description}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Badge">
          <input
            value={value.badgeText}
            onChange={(event) => onChange({ ...value, badgeText: event.target.value })}
            className="field-control"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onCreate}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            <Plus size={16} /> Create draft and homepage slot
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function DraftPreview({
  sections,
  drafts,
}: {
  sections: AdminHomepageSection[];
  drafts: Record<string, CollectionDraft>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white dark:border-slate-800">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-bright">
        Draft preview
      </p>
      <h3 className="mt-1 text-xl font-bold">How collection cards will appear</h3>
      <p className="mt-1 text-sm text-slate-400">
        Updates while you type. Product, category and wholesale cards remain interleaved
        automatically. Drafts are not visible to customers.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((section) => {
          const draft = drafts[section.collectionId] ?? toDraft(section.collection);
          return (
            <article
              key={section.id}
              className="relative flex min-h-52 overflow-hidden rounded-2xl border border-brand-strong bg-gradient-to-br from-[#EFFCF3] to-[#B8F5C8] p-4 text-slate-950"
            >
              {draft.imageUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-15"
                  style={{ backgroundImage: `url("${draft.imageUrl.replace(/["\\]/g, "")}")` }}
                />
              ) : null}
              <div className="relative flex flex-1 flex-col">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-brand-strong shadow-sm">
                  <Sparkles size={17} />
                </span>
                <p className="mt-auto pt-6 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-strong">
                  {draft.badgeText || "Featured collection"}
                </p>
                <h4 className="mt-1 text-base font-bold leading-tight">
                  {draft.displayName || "Untitled collection"}
                </h4>
                {draft.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{draft.description}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-strong">
                  {draft.ctaText || "Explore collection"} <ArrowRight size={13} />
                </span>
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase text-white">
                {statusLabel(section.status)} · slot {section.position + 1}
              </span>
            </article>
          );
        })}
        {sections.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
            Create a draft to see its storefront card here.
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionEditor({
  collection,
  draft,
  section,
  saving,
  onChange,
  onLifecycle,
}: {
  collection: MerchandisingCollectionDTO;
  draft: CollectionDraft;
  section?: AdminHomepageSection;
  saving: boolean;
  onChange: (change: Partial<CollectionDraft>) => void;
  onLifecycle: (action: "SAVE_DRAFT" | "PUBLISH" | "UNPUBLISH") => void;
}) {
  const live = collection.status === "ACTIVE" || collection.status === "SCHEDULED";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${live ? "bg-brand-soft text-brand-strong" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {statusLabel(collection.status)}
          </span>
          <p className="mt-2 font-mono text-[11px] text-slate-400">
            {collection.key} · {section ? `homepage slot ${section.position + 1}` : "not placed"}
          </p>
        </div>
        <span className="text-xs text-slate-400">{draft.maxProducts} products max</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Display name" className="sm:col-span-2">
          <input
            value={draft.displayName}
            onChange={(event) => onChange({ displayName: event.target.value })}
            className="field-control font-semibold"
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea
            rows={2}
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Badge">
          <input
            value={draft.badgeText}
            onChange={(event) => onChange({ badgeText: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Button text">
          <input
            value={draft.ctaText}
            onChange={(event) => onChange({ ctaText: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Maximum products">
          <input
            type="number"
            min={1}
            max={1000}
            value={draft.maxProducts}
            onChange={(event) =>
              onChange({
                maxProducts: Math.min(1000, Math.max(1, Number(event.target.value) || 1)),
              })
            }
            className="field-control"
          />
        </Field>
        <Field label="Image URL" className="sm:col-span-2">
          <input
            type="url"
            value={draft.imageUrl}
            onChange={(event) => onChange({ imageUrl: event.target.value })}
            placeholder="https://…"
            className="field-control"
          />
        </Field>
        <Field label="Starts">
          <input
            type="datetime-local"
            value={draft.startAt}
            onChange={(event) => onChange({ startAt: event.target.value })}
            className="field-control"
          />
        </Field>
        <Field label="Ends">
          <input
            type="datetime-local"
            value={draft.endAt}
            onChange={(event) => onChange({ endAt: event.target.value })}
            className="field-control"
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onLifecycle("SAVE_DRAFT")}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:border-brand-border hover:text-brand-strong disabled:opacity-50 dark:border-slate-700"
        >
          <FilePenLine size={15} /> {live ? "Save draft & take offline" : "Save as draft"}
        </button>
        {live ? (
          <button
            type="button"
            onClick={() => onLifecycle("UNPUBLISH")}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            <PauseCircle size={15} /> Unpublish
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onLifecycle("PUBLISH")}
            disabled={saving || !section}
            title={!section ? "Add a homepage slot first" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            <Rocket size={15} /> Publish
          </button>
        )}
      </div>
    </article>
  );
}

function HomepageOrder({
  slots,
  sections,
  drafts,
  unplacedCollections,
  placementChoice,
  saving,
  onChoice,
  onPlace,
  onMove,
}: {
  slots: Array<AdminHomepageSection | undefined>;
  sections: AdminHomepageSection[];
  drafts: Record<string, CollectionDraft>;
  unplacedCollections: MerchandisingCollectionDTO[];
  placementChoice: Record<number, string>;
  saving: string | null;
  onChoice: (position: number, value: string) => void;
  onPlace: (position: number) => void;
  onMove: (section: AdminHomepageSection, direction: -1 | 1) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-bold">Homepage order</h3>
      <p className="mt-1 text-sm text-slate-500">
        Twelve visible slots make future planning clear. Empty slots stay invisible on the live
        storefront.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((section, position) =>
          section ? (
            <div
              key={section.id}
              className="rounded-2xl border border-brand-border bg-brand-surface p-4 dark:border-brand-strong dark:bg-[#063D1E]"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-brand-strong shadow-sm">
                  {position + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {drafts[section.collectionId]?.displayName ?? section.collection.displayName}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
                    <CheckCircle2 size={13} /> {statusLabel(section.status)} · {section.device}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onMove(section, -1)}
                    disabled={sections[0]?.id === section.id || saving === section.id}
                    className="rounded-lg border bg-white p-1.5 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900"
                    aria-label="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(section, 1)}
                    disabled={
                      sections[sections.length - 1]?.id === section.id || saving === section.id
                    }
                    className="rounded-lg border bg-white p-1.5 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900"
                    aria-label="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={position}
              className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Slot {position + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Empty placeholder
              </p>
              {unplacedCollections.length > 0 ? (
                <div className="mt-3 flex gap-2">
                  <select
                    value={placementChoice[position] ?? unplacedCollections[0]?.id ?? ""}
                    onChange={(event) => onChoice(position, event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    {unplacedCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onPlace(position)}
                    disabled={saving === `slot-${position}`}
                    className="rounded-xl bg-brand px-3 text-white hover:bg-brand-strong disabled:opacity-50"
                    aria-label={`Place collection in slot ${position + 1}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">
                  Create another draft to use this slot.
                </p>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
