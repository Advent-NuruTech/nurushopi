"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { slugifyCategory } from "@/lib/categoryUtils";
import { Upload } from "lucide-react";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  sellingPrice?: number;
  category?: string;
  description?: string;
  shortDescription?: string;
  images?: string[];
  imagePublicIds?: string[];
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [categoryInput, setCategoryInput] = useState("");

  /* ---------------- Load product ---------------- */
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/products", {
          credentials: "include",
        });
        const data = await res.json();

        const found = data.products?.find((p: Product) => p.id === id);
        if (found) {
          setProduct({
            ...found,
            images: found.images ?? [],
            imagePublicIds: found.imagePublicIds ?? [],
          });

          setCategoryInput(found.category ?? "");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /* ---------------- Load categories ---------------- */
  useEffect(() => {
    fetch("/api/admin/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  const updateField = (key: keyof Product, value: string | number | string[] | null | undefined) => {
    if (!product) return;
    setProduct({ ...product, [key]: value });
  };

  /* ---------------- Category handling ---------------- */
  const handleCategorySelect = (value: string) => {
    setCategoryInput(value);
    updateField("category", slugifyCategory(value));
  };

  const handleCategoryTyping = (value: string) => {
    setCategoryInput(value);
    updateField("category", slugifyCategory(value));
  };

  /* ---------------- Image logic ---------------- */
  const replaceImage = async (index: number, file: File | null) => {
    if (!product || !file) return;

    setUploadingIndex(index);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      const result = await res.json();

      const imgs = [...(product.images ?? [])];
      imgs[index] = result.url;
      const publicIds = [...(product.imagePublicIds ?? [])];
      publicIds[index] = result.public_id ?? publicIds[index];

      setProduct({ ...product, images: imgs, imagePublicIds: publicIds });
    } finally {
      setUploadingIndex(null);
    }
  };

  const addImage = async (file: File | null) => {
    if (!product || !file) return;

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const result = await res.json();

    setProduct({
      ...product,
      images: [...(product.images ?? []), result.url],
      imagePublicIds: [...(product.imagePublicIds ?? []), result.public_id].filter(Boolean),
    });
  };

  const removeImage = (index: number) => {
    if (!product) return;

    const imgs = [...(product.images ?? [])];
    imgs.splice(index, 1);
    const publicIds = [...(product.imagePublicIds ?? [])];
    publicIds.splice(index, 1);

    setProduct({ ...product, images: imgs, imagePublicIds: publicIds });
  };

  /* ---------------- Save ---------------- */
  const save = async () => {
    if (!product) return;
    setSaving(true);

    const res = await fetch("/api/admin/products", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });

    setSaving(false);

    if (res.ok) {
      alert("Product updated successfully");
      router.refresh();
    } else {
      alert("Update failed");
    }
  };

  /* ---------------- Delete ---------------- */
  const remove = async () => {
    if (!confirm("Delete this product?")) return;

    const res = await fetch(`/api/admin/products?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) router.push("/admin/dashboard");
  };

  if (loading) return <LoadingSpinner text="Loading product…" />;
  if (!product) return <p className="p-6">Product not found.</p>;

  const sellingPrice =
    typeof product.price === "number" && Number.isFinite(product.price)
      ? product.price
      : 0;
  const originalPrice =
    typeof product.originalPrice === "number" && Number.isFinite(product.originalPrice)
      ? product.originalPrice
      : 0;
  const discountPercent =
    originalPrice > 0 && sellingPrice > 0 && originalPrice > sellingPrice
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Product</h1>

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
          onChange={(e) =>
            updateField("price", Number(e.target.value))
          }
        />

        <input
          className="w-full border p-3 rounded"
          type="number"
          placeholder="Original Price (optional)"
          value={product.originalPrice ?? ""}
          onChange={(e) =>
            updateField(
              "originalPrice",
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
        />

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
            <span className="line-through text-gray-400">
              KSh {originalPrice.toLocaleString()}
            </span>
            <span className="font-semibold text-sky-600">
              KSh {sellingPrice.toLocaleString()}
            </span>
          </div>
        )}

        {/* Category picker */}
        <div className="space-y-2">
          <label className="font-medium">Category</label>

          <select
            className="w-full border p-3 rounded"
            value={categoryInput}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              handleCategorySelect(e.target.value)
            }
          >
            <option value="">Select existing category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            className="w-full border p-3 rounded"
            placeholder="Or type new category"
            value={categoryInput}
            onChange={(e) =>
              handleCategoryTyping(e.target.value)
            }
          />
        </div>

        <textarea
          className="w-full border p-3 rounded"
          rows={4}
          placeholder="Short description"
          value={product.shortDescription ?? ""}
          onChange={(e) =>
            updateField("shortDescription", e.target.value)
          }
        />
      </div>

      {/* Images */}
      <div className="bg-white p-5 rounded-xl border">
        <h2 className="font-semibold mb-3">Product Images</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(product.images ?? []).map((img, index) => (
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
                  onChange={(e) =>
                    replaceImage(index, e.target.files?.[0] ?? null)
                  }
                />
              </label>

              <button
                onClick={() => removeImage(index)}
                className="text-red-600 text-sm"
              >
                Remove
              </button>

              {uploadingIndex === index && (
                <p className="text-xs">Uploading…</p>
              )}
            </div>
          ))}

          <label className="border-dashed border rounded p-4 flex flex-col items-center justify-center cursor-pointer">
            <Upload className="w-6 h-6 mb-1" />
            Add Image
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) =>
                addImage(e.target.files?.[0] ?? null)
              }
            />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-sky-600 text-white rounded"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>

        <button
          onClick={remove}
          className="px-5 py-2 bg-red-600 text-white rounded"
        >
          Delete
        </button>

        <button
          onClick={() => router.back()}
          className="px-5 py-2 border rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}
