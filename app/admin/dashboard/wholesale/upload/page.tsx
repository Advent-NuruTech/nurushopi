"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  Tag,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { slugifyCategory } from "@/lib/categoryUtils";

interface WholesaleFormData {
  name: string;
  retailPrice: number | "";
  wholesalePrice: number | "";
  wholesaleMinQty: number | "";
  wholesaleUnit: string;
  description: string;
  category: string;
  files: FileList | null;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function UploadWholesalePage() {
  const [formData, setFormData] = useState<WholesaleFormData>({
    name: "",
    retailPrice: "",
    wholesalePrice: "",
    wholesaleMinQty: "",
    wholesaleUnit: "",
    description: "",
    category: "",
    files: null,
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorText, setErrorText] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const previews = imagePreviews;
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleCategorySelect = (value: string) => {
    setCategoryInput(value);
    setFormData((prev) => ({ ...prev, category: slugifyCategory(value) }));
  };

  const handleCategoryTyping = (value: string) => {
    setCategoryInput(value);
    setFormData((prev) => ({ ...prev, category: slugifyCategory(value) }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setFormData((prev) => ({ ...prev, files }));

    if (!files) {
      setImagePreviews([]);
      return;
    }

    const previews: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      previews.push(URL.createObjectURL(files[i]));
    }
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    if (!formData.files) return;
    const dt = new DataTransfer();
    const nextFiles = Array.from(formData.files);
    nextFiles.splice(index, 1);
    nextFiles.forEach((file) => dt.items.add(file));
    setFormData((prev) => ({ ...prev, files: dt.files }));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setFileInputKey((k) => k + 1);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      retailPrice: "",
      wholesalePrice: "",
      wholesaleMinQty: "",
      wholesaleUnit: "",
      description: "",
      category: "",
      files: null,
    });
    setCategoryInput("");
    setUploadedImages([]);
    setImagePreviews([]);
    setProgress(0);
    setErrorText("");
    setStatus("idle");
    setFileInputKey((k) => k + 1);
  };

  const closeStatus = () => {
    setStatus("idle");
    setErrorText("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!formData.name.trim()) {
      setErrorText("Product name is required.");
      setStatus("error");
      return;
    }
    if (!formData.category.trim()) {
      setErrorText("Category is required.");
      setStatus("error");
      return;
    }
    if (!formData.files || formData.files.length === 0) {
      setErrorText("At least one image is required.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setUploadedImages([]);

    try {
      const uploaded: string[] = [];
      for (let i = 0; i < formData.files.length; i += 1) {
        const fd = new FormData();
        fd.append("file", formData.files[i]);
        const uploadRes = await fetch("/api/wholesale/upload", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const uploadJson = (await uploadRes.json()) as { url?: string; error?: string };
        if (!uploadRes.ok || !uploadJson.url) {
          throw new Error(uploadJson.error || "Failed to upload one or more images.");
        }
        uploaded.push(uploadJson.url);
        setUploadedImages([...uploaded]);
        setProgress(((i + 1) / formData.files.length) * 100);
      }

      const payload = {
        name: formData.name.trim(),
        price: Number(formData.retailPrice),
        wholesalePrice: Number(formData.wholesalePrice),
        wholesaleMinQty: Number(formData.wholesaleMinQty),
        wholesaleUnit: formData.wholesaleUnit.trim(),
        description: formData.description.trim(),
        category: formData.category,
        images: uploaded,
        coverImage: uploaded[0] ?? null,
      };

      const createRes = await fetch("/api/wholesale/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const createJson = (await createRes.json()) as { error?: string };
      if (!createRes.ok) {
        throw new Error(createJson.error || "Failed to create wholesale product.");
      }
      setStatus("success");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Upload failed.");
      setStatus("error");
    }
  };

  const retail = typeof formData.retailPrice === "number" ? formData.retailPrice : 0;
  const wholesale = typeof formData.wholesalePrice === "number" ? formData.wholesalePrice : 0;
  const discountPercent =
    retail > 0 && wholesale > 0 && wholesale < retail
      ? Math.round(((retail - wholesale) / retail) * 100)
      : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Upload Wholesale Product</h1>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div>
            <label className="mb-2 flex items-center gap-2 font-semibold">
              <Tag className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Product Name
            </label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold">Retail Price (KSh)</label>
              <input
                type="number"
                value={formData.retailPrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    retailPrice: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-2 block font-semibold">Wholesale Price (KSh)</label>
              <input
                type="number"
                value={formData.wholesalePrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    wholesalePrice: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {discountPercent && (
            <div className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {discountPercent}% cheaper in wholesale
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold">Minimum Wholesale Quantity</label>
              <input
                type="number"
                value={formData.wholesaleMinQty}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    wholesaleMinQty: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-2 block font-semibold">Wholesale Unit</label>
              <input
                placeholder="Carton, Box, Sack..."
                value={formData.wholesaleUnit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, wholesaleUnit: e.target.value }))
                }
                className="w-full rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Category
            </label>
            <select
              value={categoryInput}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="mb-2 w-full rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Or type new category"
              value={categoryInput}
              onChange={(e) => handleCategoryTyping(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Description
            </label>
            <textarea
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full resize-y rounded border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 font-semibold">
              <ImageIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Product Images
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 hover:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Upload className="h-5 w-5" />
              Click to upload images
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {imagePreviews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative overflow-hidden rounded border border-slate-300 dark:border-slate-700"
                  >
                    <div className="relative aspect-square">
                      <Image src={src} alt={`Preview ${index + 1}`} fill className="object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 py-1 text-center text-xs font-semibold text-white">
                        Homepage Image
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "uploading"}
            className="w-full rounded bg-sky-600 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "uploading" ? "Uploading..." : "Create Wholesale Product"}
          </button>
        </motion.form>
      </div>

      <AnimatePresence>
        {status !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              {status === "uploading" && (
                <div className="space-y-4 text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-600" />
                  <h3 className="text-lg font-semibold">Uploading wholesale product...</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{Math.round(progress)}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Uploaded {uploadedImages.length} of {formData.files?.length ?? 0} images
                  </p>
                  <div className="h-2 rounded bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-2 rounded bg-sky-600 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                </div>
              )}

              {status === "success" && (
                <div className="space-y-4 text-center">
                  <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
                  <h3 className="text-lg font-semibold">Upload successful</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Wholesale product is now available in the dashboard.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={closeStatus}
                      className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                      Close
                    </button>
                    <button
                      onClick={resetForm}
                      className="flex-1 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                    >
                      Upload Another
                    </button>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-4 text-center">
                  <XCircle className="mx-auto h-10 w-10 text-red-600" />
                  <h3 className="text-lg font-semibold">Upload failed</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {errorText || "Something went wrong while uploading."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={closeStatus}
                      className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setStatus("idle")}
                      className="flex-1 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
