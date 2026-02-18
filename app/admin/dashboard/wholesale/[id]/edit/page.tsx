"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Upload } from "lucide-react";

interface WholesaleItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  wholesalePrice: number;
  wholesaleMinQty?: number;
  wholesaleUnit?: string;
  images?: string[];
}

interface WholesaleResponse {
  items?: WholesaleItem[];
}

type Feedback = { type: "success" | "error"; text: string } | null;

export default function WholesaleEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [item, setItem] = useState<WholesaleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  /* ---------------- Load item ---------------- */
  useEffect(() => {
    if (!id) return;

    fetch("/api/admin/wholesale", { credentials: "include" })
      .then(r => r.json())
      .then((data: WholesaleResponse) => {
        const found = data.items?.find(i => i.id === id);
        if (found) setItem({ ...found, images: found.images ?? [] });
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* ---------------- Update helper ---------------- */
  const update = <K extends keyof WholesaleItem>(
    key: K,
    value: WholesaleItem[K]
  ) => {
    if (!item) return;
    setItem({ ...item, [key]: value });
  };

  /* ---------------- Image handling ---------------- */
  const replaceImage = async (index: number, file: File | null) => {
    if (!item || !file) return;

    setUploadingIndex(index);
    setFeedback(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/wholesale/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    const result: { url?: string; error?: string } = await res.json();
    if (!res.ok || !result.url) {
      setFeedback({ type: "error", text: result.error || "Failed to replace image." });
      setUploadingIndex(null);
      return;
    }

    const imgs = [...(item.images ?? [])];
    imgs[index] = result.url;

    setItem({ ...item, images: imgs });
    setUploadingIndex(null);
  };

  const addImage = async (file: File | null) => {
    if (!item || !file) return;
    setFeedback(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/wholesale/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    const result: { url?: string; error?: string } = await res.json();
    if (!res.ok || !result.url) {
      setFeedback({ type: "error", text: result.error || "Failed to add image." });
      return;
    }

    setItem({
      ...item,
      images: [...(item.images ?? []), result.url],
    });
  };

  const removeImage = (index: number) => {
    if (!item) return;
    const imgs = [...(item.images ?? [])];
    imgs.splice(index, 1);
    setItem({ ...item, images: imgs });
  };

  /* ---------------- Save ---------------- */
  const save = async () => {
    if (!item) return;
    setSaving(true);
    setFeedback(null);

    const res = await fetch("/api/admin/wholesale", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    setSaving(false);

    if (res.ok) {
      setFeedback({ type: "success", text: "Wholesale item updated successfully." });
      router.refresh();
    } else {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setFeedback({ type: "error", text: payload.error || "Update failed." });
    }
  };

  /* ---------------- Delete ---------------- */
  const remove = async () => {
    if (!confirm("Delete this item?")) return;

    const res = await fetch(`/api/admin/wholesale?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) router.push("/admin/dashboard/wholesale");
    else setFeedback({ type: "error", text: "Delete failed. Try again." });
  };

  if (loading) return <LoadingSpinner text="Loading item…" />;

  if (!item)
    return (
      <p className="p-6 text-gray-700 dark:text-gray-300">
        Item not found.
      </p>
    );

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
          onChange={e => update("name", e.target.value)}
          placeholder="Item Name"
        />

        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          value={item.category ?? ""}
          onChange={e => update("category", e.target.value)}
          placeholder="Category"
        />

        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          type="number"
          value={item.wholesalePrice}
          onChange={e =>
            update("wholesalePrice", Number(e.target.value))
          }
          placeholder="Wholesale Price"
        />

        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          type="number"
          value={item.price ?? ""}
          onChange={e =>
            update(
              "price",
              e.target.value === ""
                ? undefined
                : Number(e.target.value)
            )
          }
          placeholder="Retail Price"
        />

        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          type="number"
          value={item.wholesaleMinQty ?? ""}
          onChange={e =>
            update(
              "wholesaleMinQty",
              e.target.value === ""
                ? undefined
                : Number(e.target.value)
            )
          }
          placeholder="Minimum Order Quantity"
        />

        <input
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          value={item.wholesaleUnit ?? ""}
          onChange={e => update("wholesaleUnit", e.target.value)}
          placeholder="Wholesale Unit"
        />

        <textarea
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded"
          rows={4}
          value={item.description ?? ""}
          onChange={e => update("description", e.target.value)}
          placeholder="Description"
        />
      </div>

      {/* Images */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold mb-3">Images</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(item.images ?? []).map((img, i) => (
            <div
              key={i}
              className="border border-gray-200 dark:border-gray-700 rounded p-2 space-y-2"
            >
              <div className="relative w-full h-32">
                <Image
                  src={img}
                  alt="Item image"
                  fill
                  className="object-cover rounded"
                />
              </div>

              <label className="text-sm text-sky-600 cursor-pointer">
                Replace
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={e =>
                    replaceImage(i, e.target.files?.[0] ?? null)
                  }
                />
              </label>

              <button
                onClick={() => removeImage(i)}
                className="text-red-600 text-sm"
              >
                Remove
              </button>

              {uploadingIndex === i && (
                <p className="text-xs">Uploading...</p>
              )}
            </div>
          ))}

          <label className="border-dashed border border-gray-300 dark:border-gray-700 rounded p-4 flex flex-col items-center justify-center cursor-pointer">
            <Upload className="w-6 h-6 mb-1" />
            Add Image
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={e => addImage(e.target.files?.[0] ?? null)}
            />
          </label>
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

        <button
          onClick={remove}
          className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
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

