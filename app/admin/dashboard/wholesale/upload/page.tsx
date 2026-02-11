"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Tag,
  FileText,
  Package,
  X,
  Upload
} from "lucide-react";
import { slugifyCategory } from "@/lib/categoryUtils";
import Image from "next/image";

interface FormDataType {
  name: string;
  retailPrice: number | "";
  wholesalePrice: number | "";
  wholesaleMinQty: number | "";
  wholesaleUnit: string;
  description: string;
  category: string;
  files: FileList | null;
}

export default function UploadWholesalePage() {
  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    retailPrice: "",
    wholesalePrice: "",
    wholesaleMinQty: "",
    wholesaleUnit: "",
    description: "",
    category: "",
    files: null
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [status, setStatus] =
    useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);

  /* ---------- File selection ---------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setFormData(prev => ({ ...prev, files }));

    if (files) {
      const previews: string[] = [];
      for (let i = 0; i < files.length; i++) {
        previews.push(URL.createObjectURL(files[i]));
      }
      setImagePreviews(previews);
    }
  };

  /* ---------- Upload ---------- */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setStatus("uploading");
    setProgress(0);

    try {
      const uploaded: string[] = [];

      if (formData.files) {
        for (let i = 0; i < formData.files.length; i++) {
          const fd = new FormData();
          fd.append("file", formData.files[i]);

          const res = await fetch("/api/wholesale/upload", {
            method: "POST",
            credentials: "include",
            body: fd,
          });

          const result = await res.json();
          uploaded.push(result.url);
          setUploadedImages([...uploaded]);
          setProgress(((i + 1) / formData.files.length) * 100);
        }
      }

      const payload = {
        name: formData.name,
        price: Number(formData.retailPrice),
        wholesalePrice: Number(formData.wholesalePrice),
        wholesaleMinQty: Number(formData.wholesaleMinQty),
        wholesaleUnit: formData.wholesaleUnit,
        description: formData.description,
        category: formData.category,
        images: uploaded,
        coverImage: uploaded[0] || null
      };

      const res = await fetch("/api/wholesale/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  /* ---------- Discount calculation ---------- */
  const retail =
    typeof formData.retailPrice === "number"
      ? formData.retailPrice
      : 0;

  const wholesale =
    typeof formData.wholesalePrice === "number"
      ? formData.wholesalePrice
      : 0;

  const discountPercent =
    retail > 0 && wholesale > 0
      ? Math.round(((retail - wholesale) / retail) * 100)
      : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">
          Upload Wholesale Product
        </h1>

        <motion.form
          onSubmit={handleSubmit}
          className="bg-white border rounded-xl shadow p-8 space-y-6"
        >

          {/* Name */}
          <div>
            <label className="font-semibold mb-2 flex gap-2">
              <Tag size={16} /> Product Name
            </label>
            <input
              required
              className="w-full border p-3 rounded"
              onChange={e =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {/* Pricing */}
          <div>
            <label className="font-semibold mb-2 block">
              Retail Price (KSh)
            </label>
            <input
              type="number"
              className="w-full border p-3 rounded"
              onChange={e =>
                setFormData({
                  ...formData,
                  retailPrice:
                    e.target.value === "" ? "" : Number(e.target.value)
                })
              }
            />

            <label className="font-semibold mb-2 block mt-4">
              Wholesale Price
            </label>
            <input
              type="number"
              className="w-full border p-3 rounded"
              onChange={e =>
                setFormData({
                  ...formData,
                  wholesalePrice:
                    e.target.value === "" ? "" : Number(e.target.value)
                })
              }
            />

            {discountPercent && (
              <div className="mt-3 text-red-600 font-semibold">
                {discountPercent}% cheaper in wholesale
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="font-semibold mb-2 block">
              Minimum Wholesale Quantity
            </label>
            <input
              type="number"
              className="w-full border p-3 rounded"
              onChange={e =>
                setFormData({
                  ...formData,
                  wholesaleMinQty:
                    e.target.value === "" ? "" : Number(e.target.value)
                })
              }
            />

            <label className="font-semibold mb-2 block mt-4">
              Unit (Carton, Sack, Box...)
            </label>
            <input
              className="w-full border p-3 rounded"
              onChange={e =>
                setFormData({
                  ...formData,
                  wholesaleUnit: e.target.value
                })
              }
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold mb-2 flex gap-2">
              <FileText size={16} /> Description
            </label>
            <textarea
              rows={6}
              className="w-full border p-3 rounded"
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Images */}
          <div>
            <label className="font-semibold mb-2 flex gap-2">
              <ImageIcon size={16} /> Product Images
            </label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-4">
                {imagePreviews.map((img, i) => (
                  <div key={i} className="relative h-28">
                    <Image
                      src={img}
                      alt="preview"
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "uploading"}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold"
          >
            {status === "uploading"
              ? "Uploading..."
              : "Create Wholesale Product"}
          </button>

        </motion.form>
      </div>

      {/* Upload status modal */}
      <AnimatePresence>
        {status !== "idle" && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center"
          >
            <div className="bg-white p-6 rounded-lg text-center">
              {status === "uploading" && (
                <>
                  <Loader2 className="animate-spin mx-auto mb-2" />
                  Uploading... {Math.round(progress)}%
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle className="mx-auto text-green-600" />
                  Upload Complete
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="mx-auto text-red-600" />
                  Upload Failed
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
