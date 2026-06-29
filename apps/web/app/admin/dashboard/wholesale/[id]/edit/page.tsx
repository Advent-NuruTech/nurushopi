"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Upload } from "lucide-react";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { wholesaleApi, ApiClientError } from "@/lib/api";

interface WholesaleForm {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  minQuantity: number;
  images: string[];
}

type Feedback = { type: "success" | "error"; text: string } | null;

export default function WholesaleEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [item, setItem] = useState<WholesaleForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  /* ---------------- Load item ---------------- */
  useEffect(() => {
    if (!id) return;
    wholesaleApi.admin
      .getItem(id)
      .then(({ item: i }) =>
        setItem({
          id: i.id,
          name: i.name,
          description: i.description ?? "",
          unitPrice: Number(i.unitPrice),
          minQuantity: i.minQuantity,
          images: i.images,
        }),
      )
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  const update = <K extends keyof WholesaleForm>(key: K, value: WholesaleForm[K]) => {
    setItem((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  /* ---------------- Image handling ---------------- */
  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const result: { url?: string; error?: string } = await res.json();
    if (!res.ok || !result.url) {
      setFeedback({ type: "error", text: result.error || "Image upload failed." });
      return null;
    }
    return result.url;
  };

  const replaceImage = async (index: number, file: File | null) => {
    if (!item || !file) return;
    setUploadingIndex(index);
    setFeedback(null);
    try {
      const url = await uploadFile(file);
      if (!url) return;
      const imgs = [...item.images];
      imgs[index] = url;
      setItem({ ...item, images: imgs });
    } finally {
      setUploadingIndex(null);
    }
  };

  const addImage = async (file: File | null) => {
    if (!item || !file) return;
    setFeedback(null);
    const url = await uploadFile(file);
    if (!url) return;
    setItem({ ...item, images: [...item.images, url].slice(0, 3) });
  };

  const removeImage = (index: number) => {
    if (!item) return;
    const imgs = [...item.images];
    imgs.splice(index, 1);
    setItem({ ...item, images: imgs });
  };

  /* ---------------- Save ---------------- */
  const save = async () => {
    if (!item) return;
    setSaving(true);
    setFeedback(null);
    try {
      await wholesaleApi.admin.updateItem(item.id, {
        name: item.name,
        description: item.description || null,
        unitPrice: item.unitPrice,
        minQuantity: item.minQuantity,
        images: item.images.slice(0, 3),
      });
      setFeedback({ type: "success", text: "Wholesale item updated successfully." });
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Update failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Delete ---------------- */
  const remove = async () => {
    if (!confirm("Delete this item?")) return;
    try {
      await wholesaleApi.admin.deleteItem(id);
      router.push(adminRoute(`${ADMIN_DASHBOARD_PATH}/wholesale`));
    } catch {
      setFeedback({ type: "error", text: "Delete failed. Try again." });
    }
  };

  if (loading) return <LoadingSpinner text="Loading item…" />;

  if (!item) return <p className="p-6 text-gray-700 dark:text-gray-300">Item not found.</p>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 text-gray-800 dark:text-gray-100">
      <h1 className="text-2xl font-bold">Edit Wholesale Item</h1>

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="rounded border border-current px-2 py-0.5 text-xs hover:opacity-80"
          >
            Close
          </button>
        </div>
      )}

      {/* Details */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          value={item.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Item Name"
        />

        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          type="number"
          value={item.unitPrice}
          onChange={(e) => update("unitPrice", Number(e.target.value))}
          placeholder="Unit Price"
        />

        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          type="number"
          value={item.minQuantity}
          onChange={(e) => update("minQuantity", Number(e.target.value))}
          placeholder="Minimum Order Quantity"
        />

        <textarea
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          rows={4}
          value={item.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Description"
        />
      </div>

      {/* Images */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold mb-3">Images (max 3)</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {item.images.map((img, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded p-2 space-y-2">
              <div className="relative w-full h-32">
                <Image src={img} alt="Item image" fill className="object-cover rounded" />
              </div>

              <label className="text-sm text-sky-600 cursor-pointer">
                Replace
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => replaceImage(i, e.target.files?.[0] ?? null)}
                />
              </label>

              <button onClick={() => removeImage(i)} className="text-red-600 text-sm">
                Remove
              </button>

              {uploadingIndex === i && <p className="text-xs">Uploading...</p>}
            </div>
          ))}

          {item.images.length < 3 && (
            <label className="border-dashed border border-gray-300 dark:border-gray-700 rounded p-4 flex flex-col items-center justify-center cursor-pointer">
              <Upload className="w-6 h-6 mb-1" />
              Add Image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => addImage(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button onClick={remove} className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Delete
        </button>

        <button
          onClick={() => router.back()}
          className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}
