"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Image as ImageIcon,
  Tag,
  FileText,
  DollarSign,
  Package,
  AlertCircle
} from "lucide-react";

type ProductCategory = 
  | "herbs" 
  | "oils" 
  | "foods" 
  | "egw" 
  | "pioneers" 
  | "authors" 
  | "bibles" 
  | "covers" 
  | "songbooks";

interface ProductFormData {
  name: string;
  price: number | "";
  shortDescription: string;
  category: ProductCategory;
  files: FileList | null;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function UploadProductPage() {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: "",
    shortDescription: "",
    category: "herbs",
    files: null
  });

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🔥 Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 🔒 Redirect to login if not signed in
  useEffect(() => {
    if (!loadingAuth && !user) {
      window.location.href = "/auth/login?redirectTo=/uploadproduct";
    }
  }, [loadingAuth, user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (Number(formData.price) <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = "Description is required";
    } else if (formData.shortDescription.length < 10) {
      newErrors.shortDescription = "Description must be at least 10 characters";
    }

    if (formData.files && formData.files.length > 3) {
      newErrors.files = "Maximum 3 images allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFormData(prev => ({ ...prev, files: e.dataTransfer.files }));
      setErrors(prev => ({ ...prev, files: "" }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, files: e.target.files }));
    setErrors(prev => ({ ...prev, files: "" }));
  };

  const removeFile = (index: number) => {
    if (!formData.files) return;
    
    const dt = new DataTransfer();
    for (let i = 0; i < formData.files.length; i++) {
      if (i !== index) dt.items.add(formData.files[i]);
    }
    
    setFormData(prev => ({ ...prev, files: dt.files.length > 0 ? dt.files : null }));
  };

  const handleInputChange = (field: keyof Omit<ProductFormData, 'files'>) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = field === 'price' 
      ? (e.target.value === "" ? "" : Number(e.target.value))
      : e.target.value;
    
    setFormData(prev => ({ 
      ...prev, 
      [field]: value 
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setUploadedImages([]);

    try {
      const uploaded: string[] = [];

      // Upload files to Cloudinary
      if (formData.files && formData.files.length > 0) {
        for (let i = 0; i < formData.files.length; i++) {
          const formDataObj = new FormData();
          formDataObj.append("file", formData.files[i]);

          const xhr = new XMLHttpRequest();
          const uploadPromise = new Promise<string>((resolve, reject) => {
            xhr.open("POST", "/api/upload");

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                const progressPerFile = percent / formData.files!.length;
                const baseProgress = (i * 100) / formData.files!.length;
                setProgress(baseProgress + progressPerFile);
              }
            };

            xhr.onload = () => {
              if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText);
                uploaded.push(result.url);
                setUploadedImages(prev => [...prev, result.url]);
                resolve(result.url);
              } else {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            };

            xhr.onerror = () => reject(new Error("Upload failed"));
            xhr.send(formDataObj);
          });

          await uploadPromise;
        }
      }

      // Save product to Firestore
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        shortDescription: formData.shortDescription,
        category: formData.category,
        images: uploaded,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to create product record");

      setStatus("success");
      setProgress(100);

      // Reset form after successful upload
      setTimeout(() => {
        setFormData({
          name: "",
          price: "",
          shortDescription: "",
          category: "herbs",
          files: null
        });
        setUploadedImages([]);
        setStatus("idle");
      }, 2000);

    } catch (error) {
      console.error("Error creating product:", error);
      setStatus("error");
    }
  }

  const categoryOptions: { value: ProductCategory; label: string; icon: React.ReactNode }[] = [
    { value: "herbs", label: "Remedies", icon: "🌿" },
    { value: "oils", label: "Oils", icon: "🧴" },
    { value: "foods", label: "Foods", icon: "🥗" },
    { value: "egw", label: "EGW Books", icon: "📚" },
    { value: "pioneers", label: "Pioneer Books", icon: "📜" },
    { value: "authors", label: "Other Authors", icon: "✍️" },
    { value: "bibles", label: "Bibles", icon: "📖" },
    { value: "covers", label: "Covers", icon: "📕" },
    { value: "songbooks", label: "Song Books", icon: "🎵" },
  ];

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Upload New Product
          </h1>
          <p className="text-gray-600 mt-2">
            Add products to the NuruShop inventory
          </p>
        </motion.div>

        {/* Progress Indicator */}
        {status === "uploading" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-white rounded-xl p-6 shadow-lg border"
          >
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <h3 className="font-semibold">Uploading Product...</h3>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 text-right">{Math.round(progress)}%</p>
          </motion.div>
        )}

        {/* Success Message */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Product Created Successfully!</h3>
                  <p className="text-green-600 text-sm mt-1">
                    Your product has been added to the inventory.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">Upload Failed</h3>
                  <p className="text-red-600 text-sm mt-1">
                    There was an error uploading your product. Please try again.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-200"
        >
          {/* Product Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Tag className="w-4 h-4" />
              Product Name
            </label>
            <input
              value={formData.name}
              onChange={handleInputChange('name')}
              required
              className={`block w-full border rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., Pure Organic Olive Oil"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.name}
              </p>
            )}
          </div>

          {/* Price and Category in Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <DollarSign className="w-4 h-4" />
                Price (KSh)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={handleInputChange('price')}
                required
                min="0"
                step="0.01"
                className={`block w-full border rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., 850"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.price}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Package className="w-4 h-4" />
                Category
              </label>
              <select
                value={formData.category}
                onChange={handleInputChange('category')}
                className="block w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              Short Description
            </label>
            <textarea
              value={formData.shortDescription}
              onChange={handleInputChange('shortDescription')}
              required
              rows={3}
              className={`block w-full border rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none ${errors.shortDescription ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Describe your product in a few sentences..."
              maxLength={200}
            />
            {errors.shortDescription && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.shortDescription}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400 text-right">
              {formData.shortDescription.length}/200 characters
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4" />
              Product Images
            </label>
            
            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${errors.files ? 'border-red-500' : ''}`}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-700 font-medium">
                Drag & drop images here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Upload up to 3 images (PNG, JPG, WEBP)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Recommended: 1200×800 pixels
              </p>
            </div>

            {errors.files && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.files}
              </p>
            )}

            {/* Selected Files Preview */}
            {formData.files && formData.files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4"
              >
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Selected Files ({formData.files.length}/3):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from(formData.files).map((file, index) => (
                    <div
                      key={index}
                      className="relative group border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4"
              >
                <p className="text-sm font-medium text-green-600 mb-2">
                  Uploaded Successfully:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {uploadedImages.map((url, index) => (
                    <div
                      key={index}
                      className="relative border border-green-200 rounded-lg overflow-hidden bg-green-50"
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <p className="text-sm truncate">Image {index + 1}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={status === "uploading"}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === "uploading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Create Product
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Make sure all information is accurate before submitting.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Product will be reviewed before appearing in the shop.
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}