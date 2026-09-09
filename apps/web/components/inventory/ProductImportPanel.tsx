"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, PackagePlus, Upload } from "lucide-react";
import type { CategoryDTO, MerchandisingCollectionDTO, ProductImportResult } from "@nuru/types";
import { ApiClientError, catalogApi, merchandisingApi } from "@/lib/api";

type Actor = "admin" | "vendor";
type Channel = "retail" | "wholesale" | "both";

const CSV_HEADER =
  "channel,name,sku,price,wholesalePrice,minQuantity,stock,categoryId,brandName,storeName,description,imageUrls,collectionKeys,isActive";
const CSV_EXAMPLE =
  "retail,Natural Honey,HONEY-500,850,,1,24,,Nuru Naturals,NuruShop,Raw Kenyan honey,https://example.com/honey.jpg,new_arrivals|spotlight,true";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  return rows;
}

function csvRowsToImport(text: string) {
  const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!headers) throw new Error("The CSV file is empty.");
  const positions = new Map(headers.map((header, index) => [header.trim(), index]));
  for (const required of ["channel", "name", "sku", "price", "stock"]) {
    if (!positions.has(required)) throw new Error(`Missing required CSV column: ${required}.`);
  }
  const value = (row: string[], key: string) => row[positions.get(key) ?? -1]?.trim() ?? "";
  return rows.map((row, index) => ({
    rowKey: String(index + 2),
    channel: (value(row, "channel").toLowerCase() || "retail") as Channel,
    name: value(row, "name"),
    sku: value(row, "sku"),
    price: value(row, "price") ? Number(value(row, "price")) : null,
    wholesalePrice: value(row, "wholesalePrice") ? Number(value(row, "wholesalePrice")) : null,
    minQuantity: value(row, "minQuantity") ? Number(value(row, "minQuantity")) : 1,
    stock: Number(value(row, "stock")),
    lowStockThreshold: 5,
    categoryId: value(row, "categoryId") || null,
    brandName: value(row, "brandName") || null,
    storeName: value(row, "storeName") || null,
    description: value(row, "description") || null,
    images: value(row, "imageUrls")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
    collectionKeys: value(row, "collectionKeys")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
    isActive: !["false", "0", "no"].includes(value(row, "isActive").toLowerCase()),
  }));
}

export default function ProductImportPanel({
  actor,
  defaultChannel = "retail",
  allowCollectionAssignment = true,
  onImported,
}: {
  actor: Actor;
  defaultChannel?: Channel;
  allowCollectionAssignment?: boolean;
  onImported?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "csv">("single");
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [collections, setCollections] = useState<MerchandisingCollectionDTO[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [csvText, setCsvText] = useState(`${CSV_HEADER}\n${CSV_EXAMPLE}`);
  const [form, setForm] = useState({
    channel: defaultChannel,
    name: "",
    sku: "",
    price: "",
    wholesalePrice: "",
    minQuantity: "1",
    stock: "0",
    categoryId: "",
    brandName: "",
    description: "",
    imageUrls: "",
  });
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip" | "error">("update");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<ProductImportResult | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      actor === "admin" ? catalogApi.admin.listCategories() : catalogApi.listCategories(),
      allowCollectionAssignment
        ? actor === "admin"
          ? merchandisingApi.admin.collections()
          : merchandisingApi.vendor.collections()
        : Promise.resolve({ collections: [] }),
    ])
      .then(([categoryData, collectionData]) => {
        setCategories(categoryData.categories);
        setCollections(collectionData.collections);
      })
      .catch(() => setFeedback("Could not load categories or merchandising collections."));
  }, [actor, allowCollectionAssignment, open]);

  const selectedNames = useMemo(
    () =>
      collections
        .filter((item) => selectedCollections.includes(item.key))
        .map((item) => item.displayName),
    [collections, selectedCollections],
  );

  function downloadTemplate() {
    const blob = new Blob([`${CSV_HEADER}\n${CSV_EXAMPLE}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nurushop-product-import.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submit(rows: ReturnType<typeof csvRowsToImport>) {
    setSubmitting(true);
    setFeedback("");
    setResult(null);
    try {
      const response =
        actor === "admin"
          ? await catalogApi.admin.importProducts({ rows, duplicateStrategy })
          : await catalogApi.vendor.importProducts({ rows, duplicateStrategy });
      setResult(response.import);
      setFeedback(
        `Import complete: ${response.import.created} created, ${response.import.updated} updated, ${response.import.skipped} skipped, ${response.import.failed} failed.`,
      );
      if (response.import.created || response.import.updated) onImported?.();
    } catch (error) {
      setFeedback(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Import failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createOne() {
    await submit([
      {
        rowKey: "single",
        channel: form.channel,
        name: form.name,
        sku: form.sku,
        price: form.price ? Number(form.price) : null,
        wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : null,
        minQuantity: Number(form.minQuantity || 1),
        stock: Number(form.stock || 0),
        lowStockThreshold: 5,
        categoryId: form.categoryId || null,
        brandName: form.brandName || null,
        storeName: null,
        description: form.description || null,
        images: form.imageUrls
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean),
        collectionKeys: form.channel === "wholesale" ? [] : selectedCollections,
        isActive: true,
      },
    ]);
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span>
          <b className="flex items-center gap-2">
            <PackagePlus size={18} className="text-brand-strong" /> Add or import inventory
          </b>
          <span className="mt-1 block text-sm text-slate-500">
            Retail, wholesale, or both—with optional merchandising assignment.
          </span>
        </span>
        <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
          {open ? "Close" : "Open"}
        </span>
      </button>
      {open && (
        <div className="border-t border-emerald-100 p-4 dark:border-emerald-950">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "single" ? "bg-brand text-white" : "bg-slate-100 dark:bg-slate-800"}`}
            >
              Create one
            </button>
            <button
              type="button"
              onClick={() => setMode("csv")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "csv" ? "bg-brand text-white" : "bg-slate-100 dark:bg-slate-800"}`}
            >
              <FileSpreadsheet size={15} className="mr-1 inline" /> CSV import
            </button>
            <button
              type="button"
              onClick={downloadTemplate}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold dark:border-slate-700"
            >
              <Download size={15} /> Template
            </button>
          </div>

          {mode === "single" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={form.channel}
                onChange={(event) =>
                  setForm((value) => ({ ...value, channel: event.target.value as Channel }))
                }
                className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="both">Retail + wholesale</option>
              </select>
              <input
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                placeholder="Product name"
                className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                value={form.sku}
                onChange={(event) =>
                  setForm((value) => ({ ...value, sku: event.target.value.toUpperCase() }))
                }
                placeholder="SKU (required)"
                className="rounded-xl border px-3 py-2 uppercase dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))}
                placeholder="Retail/reference price"
                className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
              {form.channel !== "retail" && (
                <input
                  type="number"
                  min="0"
                  value={form.wholesalePrice}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, wholesalePrice: event.target.value }))
                  }
                  placeholder="Wholesale price"
                  className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              )}
              {form.channel !== "retail" && (
                <input
                  type="number"
                  min="1"
                  value={form.minQuantity}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, minQuantity: event.target.value }))
                  }
                  placeholder="Minimum quantity"
                  className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              )}
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm((value) => ({ ...value, stock: event.target.value }))}
                placeholder="Stock"
                className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm((value) => ({ ...value, categoryId: event.target.value }))
                }
                className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                value={form.brandName}
                onChange={(event) =>
                  setForm((value) => ({ ...value, brandName: event.target.value }))
                }
                placeholder="Brand"
                className="rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((value) => ({ ...value, description: event.target.value }))
                }
                placeholder="Description"
                className="rounded-xl border px-3 py-2 sm:col-span-2 dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                value={form.imageUrls}
                onChange={(event) =>
                  setForm((value) => ({ ...value, imageUrls: event.target.value }))
                }
                placeholder="Image URLs separated by |"
                className="rounded-xl border px-3 py-2 sm:col-span-2 dark:border-slate-700 dark:bg-slate-950"
              />
              {allowCollectionAssignment && form.channel !== "wholesale" && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Add to merchandising
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {collections.map((collection) => (
                      <label
                        key={collection.id}
                        className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm dark:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCollections.includes(collection.key)}
                          onChange={() =>
                            setSelectedCollections((keys) =>
                              keys.includes(collection.key)
                                ? keys.filter((key) => key !== collection.key)
                                : [...keys, collection.key],
                            )
                          }
                        />
                        {collection.displayName}
                        <code className="text-[10px] text-slate-400">{collection.key}</code>
                      </label>
                    ))}
                  </div>
                  {selectedNames.length > 0 && (
                    <p className="mt-2 text-xs text-brand-strong">
                      Will appear in: {selectedNames.join(", ")}
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                disabled={
                  submitting ||
                  !form.name.trim() ||
                  !form.sku.trim() ||
                  (form.channel !== "wholesale" && !form.price) ||
                  (form.channel !== "retail" && !form.wholesalePrice)
                }
                onClick={() => void createOne()}
                className="rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong disabled:opacity-50 sm:col-span-2 lg:col-span-4"
              >
                {submitting ? "Saving…" : "Create product"}
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Use collection keys separated by <code>|</code>. Keys stay stable even when an admin
                changes a collection name. Wholesale-only rows should leave collectionKeys empty.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void file.text().then(setCsvText);
                }}
                className="block w-full text-sm"
              />
              <textarea
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                rows={8}
                className="w-full rounded-xl border p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm">
                  When SKU exists:{" "}
                  <select
                    value={duplicateStrategy}
                    onChange={(event) =>
                      setDuplicateStrategy(event.target.value as typeof duplicateStrategy)
                    }
                    className="ml-2 rounded-lg border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="update">Update it</option>
                    <option value="skip">Skip it</option>
                    <option value="error">Report error</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    try {
                      void submit(csvRowsToImport(csvText));
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : "Invalid CSV.");
                    }
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
                >
                  <Upload size={16} /> {submitting ? "Importing…" : "Import CSV"}
                </button>
              </div>
            </div>
          )}

          {feedback && (
            <p
              className={`mt-4 rounded-xl px-3 py-2 text-sm ${result?.failed ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}
            >
              {feedback}
            </p>
          )}
          {result && result.failed > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-rose-700">
              {result.results
                .filter((row) => row.status === "failed")
                .map((row) => (
                  <li key={`${row.row}-${row.sku}`}>
                    Row {row.row} ({row.sku}): {row.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
