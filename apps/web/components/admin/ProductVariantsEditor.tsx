"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Layers, Plus, Trash2 } from "lucide-react";
import { productVariantsSchema, type ProductVariant } from "@nuru/types";

export interface VariantDraft {
  key: number;
  name: string;
  imageUrl: string;
  file: File | null;
}

export async function prepareVariants(drafts: VariantDraft[]): Promise<ProductVariant[]> {
  // Validate the entire section before starting any uploads.
  const checked = productVariantsSchema.safeParse(drafts.map((draft) => ({
    name: draft.name, imageUrl: draft.file ? null : draft.imageUrl.trim() || null,
  })));
  if (!checked.success) throw new Error(checked.error.issues[0].message);
  const variants: ProductVariant[] = [];
  for (const [index, draft] of drafts.entries()) {
    let imageUrl = checked.data[index].imageUrl;
    if (draft.file) {
      const body = new FormData();
      body.append("file", draft.file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.url) {
        throw new Error(`${draft.name}: ${result.error || "Image upload failed. Please try again."}`);
      }
      imageUrl = result.url;
    }
    variants.push({ name: checked.data[index].name, imageUrl });
  }
  return productVariantsSchema.parse(variants);
}

const inputClass = "mt-2 block w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

function VariantRow({ draft, index, onChange, onRemove }: {
  draft: VariantDraft; index: number;
  onChange: (value: VariantDraft) => void; onRemove: () => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<"upload" | "url">(draft.imageUrl ? "url" : "upload");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    if (!draft.file) { setPreview(""); return; }
    const url = URL.createObjectURL(draft.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.file]);
  const src = draft.file ? preview : /^https?:\/\//i.test(draft.imageUrl.trim()) ? draft.imageUrl.trim() : "";
  useEffect(() => setBroken(false), [src]);

  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/40">
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Variant {index + 1}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove variant ${index + 1}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={18} /></button>
    </div>
    <div className="grid min-w-0 gap-4 sm:grid-cols-[96px_1fr]">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
        {src && !broken ? <img src={src} alt={draft.name || `Variant ${index + 1}`} className="h-full w-full object-cover" onError={() => setBroken(true)} /> : <ImagePlus className="text-slate-400" size={28} />}
      </div>
      <div className="min-w-0 space-y-4">
        <label htmlFor={`${id}-name`} className="block text-sm font-medium">Variant name <span className="text-rose-600">*</span>
          <input id={`${id}-name`} required maxLength={100} value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="e.g. Black / 128 GB or Blue / Medium" className={inputClass} />
        </label>
        <div>
          <p className="mb-2 text-sm font-medium">Variant image <span className="font-normal text-slate-500">(optional)</span></p>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={`Image source for variant ${index + 1}`}>
            {(["upload", "url"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setError(""); onChange({ ...draft, file: null, imageUrl: "" }); }} className={`rounded-lg border px-3 py-2 text-sm font-medium ${mode === value ? "border-brand bg-brand-surface text-brand-strong" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300"}`}>{value === "upload" ? "Upload image" : "Paste URL"}</button>)}
          </div>
          {mode === "upload" ? <label className="block text-sm text-slate-500">JPG, PNG, WebP or GIF · up to 10 MB
            <input aria-label={`Upload image for variant ${index + 1}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-surface file:px-3 file:py-2 file:text-brand-strong`} onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
                setError("Choose a JPG, PNG, WebP or GIF image under 10 MB."); e.target.value = ""; onChange({ ...draft, file: null }); return;
              }
              setError(""); onChange({ ...draft, file, imageUrl: "" });
            }} />
          </label> : <input aria-label={`Image URL for variant ${index + 1}`} type="url" pattern="https?://.*" value={draft.imageUrl} onChange={(e) => onChange({ ...draft, imageUrl: e.target.value, file: null })} placeholder="https://example.com/variant.jpg" className={inputClass} />}
          {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
          {broken && <p className="mt-2 text-sm text-amber-700">Preview unavailable. Check that the link points directly to an image.</p>}
        </div>
      </div>
    </div>
  </div>;
}

export default function ProductVariantsEditor({ value, onChange, disabled = false }: {
  value: VariantDraft[]; onChange: (value: VariantDraft[]) => void; disabled?: boolean;
}) {
  const nextKey = useRef(0);
  return <fieldset disabled={disabled} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 disabled:opacity-60 sm:p-5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <legend className="px-2 text-base font-semibold">Product variants <span className="ml-2 text-xs font-normal text-slate-500">Optional</span></legend>
    <div className="flex gap-3"><Layers className="mt-0.5 shrink-0 text-brand" size={20} /><p className="text-sm text-slate-600 dark:text-slate-300">Offer colours, sizes or other options. Each variant can have its own image. Variants share this product’s price and stock; without an image, the product image is used.</p></div>
    {value.map((draft, index) => <VariantRow key={draft.key} draft={draft} index={index} onChange={(updated) => onChange(value.map((v) => v.key === draft.key ? updated : v))} onRemove={() => onChange(value.filter((v) => v.key !== draft.key))} />)}
    <button type="button" disabled={value.length >= 50} onClick={() => { nextKey.current = Math.max(nextKey.current, ...value.map((v) => v.key + 1)); onChange([...value, { key: nextKey.current++, name: "", imageUrl: "", file: null }]); }} className="inline-flex items-center gap-2 rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand-strong hover:bg-brand-surface disabled:opacity-50 dark:text-brand-bright"><Plus size={18} />{value.length ? "Add another variant" : "Add variants"}</button>
    <p className="text-xs text-slate-500">{value.length ? `${value.length} of 50 variants. Remove all variants to sell a single option.` : "Selling a single option? Leave this section empty."}</p>
  </fieldset>;
}
