"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Upload } from "lucide-react";
import Image from "next/image";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { catalogApi, ApiClientError } from "@/lib/api";
import type { CategoryDTO } from "@nuru/types";

interface ProductForm {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  categoryId: string | null;
  description: string;
  shortDescription: string;
  images: string[];
}

type Feedback = { type: "success" | "error"; text: string } | null;

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<ProductForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  /* ---------------- Load product ---------------- */
  useEffect(() => {
    if (!id) return;
    catalogApi
      .getProduct(id)
      .then(({ product: p }) => {
        setProduct({
          id: p.id,
          name: p.name,
          price: Number(p.sellingPrice ?? p.price),
          originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
          stock: p.stock,
          categoryId: p.categoryId,
          description: p.description ?? "",
          shortDescription: p.shortDescription ?? "",
          images: p.images,
        });
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  /* ---------------- Load categories ---------------- */
  useEffect(() => {
    catalogApi
      .listCategories()
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]));
  }, []);

  const updateField = (
    key: keyof ProductForm,
    value: string | number | string[] | null,
  ) => {
    setProduct((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  /* ---------------- Image logic ---------------- */
  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const result = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !result.url) {
      setFeedback({ type: "error", text: result.error || "Image upload failed." });
      return null;
    }
    return result.url;
  };

  const replaceImage = async (index: number, file: File | null) => {
    if (!product || !file) return;
    setUploadingIndex(index);
    setFeedback(null);
    try {
      const url = await uploadFile(file);
      if (!url) return;
      const imgs = [...product.images];
      imgs[index] = url;
      setProduct({ ...product, images: imgs });
    } finally {
      setUploadingIndex(null);
    }
  };

  const addImage = async (file: File | null) => {
    if (!product || !file) return;
    setFeedback(null);
    const url = await uploadFile(file);
    if (!url) return;
    setProduct({ ...product, images: [...product.images, url].slice(0, 3) });
  };

  const removeImage = (index: number) => {
    if (!product) return;
    const imgs = [...product.images];
    imgs.splice(index, 1);
    setProduct({ ...product, images: imgs });
  };

  /* ---------------- Save ---------------- */
  const save = async () => {
    if (!product) return;
    setSaving(true);
    setFeedback(null);
    try {
      await catalogApi.admin.updateProduct(product.id, {
        name: product.name,
        price: product.price,
        sellingPrice: product.price,
        originalPrice: product.originalPrice,
        stock: product.stock,
        categoryId: product.categoryId,
        description: product.description || null,
        shortDescription: product.shortDescription || null,
        images: product.images.slice(0, 3),
      });
      setFeedback({ type: "success", text: "Product updated successfully." });
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
    if (!confirm("Delete this product?")) return;
    try {
      await catalogApi.admin.deleteProduct(id);
      router.push(adminRoute(ADMIN_DASHBOARD_PATH));
    } catch {
      setFeedback({ type: "error", text: "Delete failed. Try again." });
    }
  };

  if (loading) return <LoadingSpinner text="Loading product…" />;
  if (!product) return <p className="p-6">Product not found.</p>;

  const sellingPrice = Number.isFinite(product.price) ? product.price : 0;
  const originalPrice =
    product.originalPrice != null && Number.isFinite(product.originalPrice)
      ? product.originalPrice
      : 0;
  const discountPercent =
    originalPrice > 0 && sellingPrice > 0 && originalPrice > sellingPrice
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Product</h1>

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

      {/* Product Info */}
      <div className="bg-white p-5 rounded-xl border space-y-4">
        <input
          className="w-full border p-3 rounded"
          placeholder="Product Name"
          value={product.name}
          onChange={(e) => updateField("name", e.target.value)}
        />

        <input
          className="w-full border p-3 rounded"
          type="number"
          placeholder="Selling Price"
          value={product.price}
          onChange={(e) => updateField("price", Number(e.target.value))}
        />

        <input
          className="w-full border p-3 rounded"
          type="number"
          placeholder="Original Price (optional)"
          value={product.originalPrice ?? ""}
          onChange={(e) =>
            updateField("originalPrice", e.target.value === "" ? null : Number(e.target.value))
          }
        />

        <input
          className="w-full border p-3 rounded"
          type="number"
          min={0}
          placeholder="Quantity in stock"
          value={product.stock}
          onChange={(e) => updateField("stock", Math.max(0, Number(e.target.value)))}
        />
        <p className={`text-sm font-medium ${product.stock > 0 ? "text-green-700" : "text-red-600"}`}>
          {product.stock > 0
            ? `${product.stock} in stock`
            : "Out of stock - ordering is disabled and admins will be notified"}
        </p>

        <div className="text-sm text-gray-600 flex items-center gap-3">
          {discountPercent ? (
            <>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {discountPercent}% OFF
              </span>
              <span>Discount badge preview</span>
            </>
          ) : (
            <span className="text-gray-500">No discount badge</span>
          )}
        </div>
        {discountPercent && (
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-gray-400">KSh {originalPrice.toLocaleString()}</span>
            <span className="font-semibold text-sky-600">KSh {sellingPrice.toLocaleString()}</span>
          </div>
        )}

        {/* Category picker */}
        <div className="space-y-2">
          <label className="font-medium">Category</label>
          <select
            className="w-full border p-3 rounded"
            value={product.categoryId ?? ""}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              updateField("categoryId", e.target.value || null)
            }
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="w-full border p-3 rounded"
          rows={4}
          placeholder="Short description"
          value={product.shortDescription}
          onChange={(e) => updateField("shortDescription", e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded"
          rows={6}
          placeholder="Full description"
          value={product.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </div>

      {/* Images */}
      <div className="bg-white p-5 rounded-xl border">
        <h2 className="font-semibold mb-3">Product Images (max 3)</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {product.images.map((img, index) => (
            <div key={index} className="border rounded p-2 space-y-2">
              <div className="relative w-full h-32 rounded overflow-hidden">
                <Image
                  src={img}
                  alt={`Product image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>

              <label className="text-sm text-sky-600 cursor-pointer">
                Replace
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => replaceImage(index, e.target.files?.[0] ?? null)}
                />
              </label>

              <button onClick={() => removeImage(index)} className="text-red-600 text-sm">
                Remove
              </button>

              {uploadingIndex === index && <p className="text-xs">Uploading…</p>}
            </div>
          ))}

          {product.images.length < 3 && (
            <label className="border-dashed border rounded p-4 flex flex-col items-center justify-center cursor-pointer">
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
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="px-5 py-2 bg-sky-600 text-white rounded">
          {saving ? "Saving…" : "Save Changes"}
        </button>

        <button onClick={remove} className="px-5 py-2 bg-red-600 text-white rounded">
          Delete
        </button>

        <button onClick={() => router.back()} className="px-5 py-2 border rounded">
          Back
        </button>
      </div>
    </div>
  );
}
