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

interface ProductFormData {
  name: string;
  price: number | "";
  originalPrice: number | "";
  description: string;
  category: string;
  files: FileList | null;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export default function UploadProductPage() {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: "",
    originalPrice: "",
    description: "",
    category: "",
    files: null
  });

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  /* ---------- Detect system dark mode ---------- */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  /* ---------- Load categories ---------- */
  useEffect(() => {
    fetch("/api/admin/categories", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  /* ---------- Category logic ---------- */
  const handleCategorySelect = (value: string) => {
    setCategoryInput(value);
    setFormData(prev => ({
      ...prev,
      category: slugifyCategory(value)
    }));
  };

  const handleCategoryTyping = (value: string) => {
    setCategoryInput(value);
    setFormData(prev => ({
      ...prev,
      category: slugifyCategory(value)
    }));
  };

  /* ---------- File selection with preview ---------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setFormData(prev => ({ ...prev, files }));

    // Create preview URLs for selected images
    if (files) {
      const previews: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewUrl = URL.createObjectURL(file);
        previews.push(previewUrl);
      }
      setImagePreviews(previews);
    } else {
      setImagePreviews([]);
    }
  };

  /* ---------- Clean up preview URLs ---------- */
  useEffect(() => {
    const previews = imagePreviews;
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  /* ---------- Upload ---------- */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setStatus("uploading");
    setProgress(0);
    setUploadedImages([]);

    try {
      const uploaded: string[] = [];

      if (formData.files) {
        for (let i = 0; i < formData.files.length; i++) {
          const fd = new FormData();
          fd.append("file", formData.files[i]);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: fd,
          });

          const result = await res.json();
          uploaded.push(result.url);
          setUploadedImages([...uploaded]);
          setProgress(((i + 1) / formData.files.length) * 100);
        }
      }

      const originalPriceValue =
        formData.originalPrice === "" ? undefined : Number(formData.originalPrice);
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        originalPrice:
          typeof originalPriceValue === "number" && Number.isFinite(originalPriceValue)
            ? originalPriceValue
            : undefined,
        description: formData.description,
        shortDescription: formData.description.slice(0, 160),
        category: formData.category,
        images: uploaded,
        coverImage: uploaded[0] || null // first image becomes homepage image
      };

      const response = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error();

      setStatus("success");
      setProgress(100);

    } catch {
      setStatus("error");
    }
  }

  /* ---------- Reset form after success ---------- */
  const handleReset = () => {
    setStatus("idle");
    setUploadedImages([]);
    setImagePreviews([]);
    setFormData({
      name: "",
      price: "",
      originalPrice: "",
      description: "",
      category: "",
      files: null
    });
    setCategoryInput("");
    setProgress(0);
  };

  const sellingPrice =
    typeof formData.price === "number" && Number.isFinite(formData.price)
      ? formData.price
      : 0;
  const originalPrice =
    typeof formData.originalPrice === "number" && Number.isFinite(formData.originalPrice)
      ? formData.originalPrice
      : 0;
  const discountPercent =
    originalPrice > 0 && sellingPrice > 0 && originalPrice > sellingPrice
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : null;

  /* ---------- Remove a specific image ---------- */
  const removeImage = (index: number) => {
    if (!formData.files) return;
    
    const dt = new DataTransfer();
    const filesArray = Array.from(formData.files);
    filesArray.splice(index, 1);
    
    filesArray.forEach(file => dt.items.add(file));
    
    const newFiles = dt.files;
    setFormData(prev => ({ ...prev, files: newFiles }));
    
    // Update previews
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 py-8 px-4 ${
      darkMode 
        ? "bg-gray-900 text-gray-100" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Upload Product
          </h1>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className={`rounded-xl shadow-lg border p-8 space-y-6 transition-colors duration-300 ${
            darkMode 
              ? "bg-gray-800 border-gray-700" 
              : "bg-white border-gray-200"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >

          {/* Name */}
          <div>
            <label className={`font-semibold flex gap-2 mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <Tag size={16} className={darkMode ? "text-blue-400" : "text-blue-600"} /> 
              Product Name
            </label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full p-3 rounded transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500" 
                  : "border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              } border focus:outline-none focus:ring-2`}
            />
          </div>

          {/* Price */}
          <div>
            <label className={`font-semibold mb-2 block ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Selling Price (KSh)
            </label>
            <input
              required
              type="number"
              value={formData.price}
              onChange={e =>
                setFormData({
                  ...formData,
                  price: e.target.value === "" ? "" : Number(e.target.value)
                })
              }
              className={`w-full p-3 rounded transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500" 
                  : "border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              } border focus:outline-none focus:ring-2`}
            />
            <label className={`font-semibold mb-2 block mt-4 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Original Price (KSh) <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <input
              type="number"
              value={formData.originalPrice}
              onChange={e =>
                setFormData({
                  ...formData,
                  originalPrice: e.target.value === "" ? "" : Number(e.target.value)
                })
              }
              className={`w-full p-3 rounded transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500" 
                  : "border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              } border focus:outline-none focus:ring-2`}
            />
            <div className="mt-3 flex items-center gap-3 text-sm">
              {discountPercent ? (
                <>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    darkMode ? "bg-red-900/40 text-red-200" : "bg-red-100 text-red-700"
                  }`}>
                    {discountPercent}% OFF
                  </span>
                  <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    Discount badge preview
                  </span>
                </>
              ) : (
                <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                  No discount badge
                </span>
              )}
            </div>
            {discountPercent && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="line-through text-gray-400">
                  KSh {originalPrice.toLocaleString()}
                </span>
                <span className="font-semibold text-blue-600">
                  KSh {sellingPrice.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className={`font-semibold flex gap-2 mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <Package size={16} className={darkMode ? "text-blue-400" : "text-blue-600"} /> 
              Category
            </label>

            <select
              value={categoryInput}
              onChange={e => handleCategorySelect(e.target.value)}
              className={`w-full p-3 rounded mb-2 transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500" 
                  : "border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              } border focus:outline-none focus:ring-2`}
            >
              <option value="" className={darkMode ? "bg-gray-700" : "bg-white"}>
                Select category
              </option>
              {categories.map(c => (
                <option 
                  key={c.id} 
                  value={c.slug}
                  className={darkMode ? "bg-gray-700" : "bg-white"}
                >
                  {c.name}
                </option>
              ))}
            </select>

            <input
              placeholder="Or type new category"
              value={categoryInput}
              onChange={e => handleCategoryTyping(e.target.value)}
              className={`w-full p-3 rounded transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500" 
                  : "border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              } border focus:outline-none focus:ring-2`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`font-semibold flex gap-2 mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <FileText size={16} className={darkMode ? "text-blue-400" : "text-blue-600"} /> 
              Product Description
            </label>

            <textarea
              rows={8}
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Write product description with paragraphs..."
              className={`w-full p-3 rounded leading-relaxed resize-y transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500" 
                  : "border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              } border focus:outline-none focus:ring-2`}
            />
          </div>

          {/* Images */}
          <div>
            <label className={`font-semibold flex gap-2 mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              <ImageIcon size={16} className={darkMode ? "text-blue-400" : "text-blue-600"} /> 
              Product Images
            </label>

            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 ${
              darkMode 
                ? "border-gray-600 hover:border-blue-500 bg-gray-700/50" 
                : "border-gray-300 hover:border-blue-500 bg-gray-50"
            }`}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload size={24} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                  Click to upload images
                </span>
                <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  or drag and drop
                </span>
              </label>
            </div>

            <p className={`text-sm mt-2 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}>
              First image becomes homepage image.
            </p>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <h3 className={`font-medium mb-3 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Selected Images ({imagePreviews.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div 
                      key={index} 
                      className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                        index === 0 
                          ? darkMode 
                            ? "border-green-500" 
                            : "border-green-400"
                          : darkMode 
                            ? "border-gray-600" 
                            : "border-gray-300"
                      }`}
                    >
                      <div className="aspect-square overflow-hidden relative">
                        <Image
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      </div>
                      
                      {/* Image number and homepage badge */}
                      <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${
                        darkMode ? "bg-gray-800/90 text-gray-100" : "bg-white/90 text-gray-800"
                      }`}>
                        {index + 1}
                      </div>
                      
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className={`absolute top-2 right-2 p-1 rounded-full ${
                          darkMode 
                            ? "bg-gray-800/90 text-gray-100 hover:bg-gray-700" 
                            : "bg-white/90 text-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        <X size={14} />
                      </button>
                      
                      {/* Homepage indicator */}
                      {index === 0 && (
                        <div className={`absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-medium ${
                          darkMode 
                            ? "bg-green-600/90 text-gray-100" 
                            : "bg-green-500/90 text-white"
                        }`}>
                          Homepage Image
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === "uploading" || imagePreviews.length === 0}
            className={`w-full py-3 rounded font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode 
                ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500" 
                : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              darkMode ? "focus:ring-offset-gray-900" : "focus:ring-offset-white"
            }`}
          >
            {status === "uploading" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Uploading Product...
              </span>
            ) : (
              "Create Product"
            )}
          </button>

        </motion.form>
      </div>

      {/* Upload Overlay Modal */}
      <AnimatePresence>
        {(status === "uploading" || status === "success" || status === "error") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-300 ${
              darkMode ? "bg-gray-900/90" : "bg-white/90"
            } backdrop-blur-sm`}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl shadow-2xl p-8 transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-800 border border-gray-700" 
                  : "bg-white border border-gray-200"
              }`}
            >
              {status === "uploading" && (
                <div className="text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <Loader2 className="w-full h-full animate-spin text-blue-500" />
                  </div>
                  
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${
                      darkMode ? "text-gray-100" : "text-gray-900"
                    }`}>
                      Uploading Product
                    </h3>
                    <p className={`mb-4 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Please wait while we upload your product...
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                        Uploading images...
                      </span>
                      <span className={`font-medium ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    }`}>
                      <motion.div
                        className={`h-full ${
                          darkMode ? "bg-blue-500" : "bg-blue-600"
                        }`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Uploaded images preview */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <p className={`text-sm mb-2 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}>
                        Uploaded {uploadedImages.length} of {formData.files?.length || 0} images
                      </p>
                    </div>
                  )}
                </div>
              )}

              {status === "success" && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>
                  
                  <div>
                    <h3 className={`text-2xl font-bold mb-2 ${
                      darkMode ? "text-gray-100" : "text-gray-900"
                    }`}>
                      Product Uploaded!
                    </h3>
                    <p className={`mb-2 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Your product has been successfully uploaded to the store.
                    </p>
                    <p className={`text-sm ${
                      darkMode ? "text-gray-500" : "text-gray-500"
                    }`}>
                      &quot;{formData.name}&quot; is now live
                    </p>
                  </div>

                  {/* Uploaded images preview */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <p className={`text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Uploaded Images:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedImages.slice(0, 3).map((url, index) => (
                          <div key={index} className="aspect-square rounded overflow-hidden relative">
                            <Image
                              src={url}
                              alt={`Uploaded ${index + 1}`}
                              fill
                              sizes="(max-width: 768px) 33vw, 100px"
                              className="object-cover"
                            />
                          </div>
                        ))}
                        {uploadedImages.length > 3 && (
                          <div className={`aspect-square rounded flex items-center justify-center ${
                            darkMode ? "bg-gray-700" : "bg-gray-100"
                          }`}>
                            <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                              +{uploadedImages.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleReset}
                    className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                      darkMode 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    Upload Another Product
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                  </div>
                  
                  <div>
                    <h3 className={`text-2xl font-bold mb-2 ${
                      darkMode ? "text-gray-100" : "text-gray-900"
                    }`}>
                      Upload Failed
                    </h3>
                    <p className={`mb-4 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}>
                      There was an error uploading your product. Please try again.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStatus("idle")}
                      className={`flex-1 py-3 rounded-lg font-semibold border transition-colors duration-300 ${
                        darkMode 
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-300 ${
                        darkMode 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
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
