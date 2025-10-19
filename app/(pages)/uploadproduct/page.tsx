"use client";

import React, { useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function UploadProductPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("herbs");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [progress, setProgress] = useState<number>(0);

  // --- Submit handler ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !price || !shortDescription) {
      alert("Please fill all required fields");
      return;
    }

    setStatus("uploading");
    setProgress(0);

    try {
      const uploaded: string[] = [];

      // Step 1: Upload files to Cloudinary via /api/upload
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);

          const xhr = new XMLHttpRequest();
          const uploadPromise = new Promise<string>((resolve, reject) => {
            xhr.open("POST", "/api/upload");

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setProgress(percent);
              }
            };

            xhr.onload = () => {
              if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText);
                uploaded.push(result.url);
                resolve(result.url);
              } else {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            };

            xhr.onerror = () => reject(new Error("Upload failed"));
            xhr.send(formData);
          });

          await uploadPromise;
        }
      }

      // Step 2: Save product info in Firestore (via /api/products)
      const payload = {
        name,
        price: Number(price),
        shortDescription,
        category,
        images: uploaded,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to create product record");

      // Step 3: Reset form on success
      setStatus("success");
      setProgress(100);
      setName("");
      setPrice("");
      setShortDescription("");
      setFiles(null);
    } catch (error) {
      console.error("Error creating product:", error);
      setStatus("error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Upload Product</h1>

      {/* When not signed in */}
      <SignedOut>
        <div className="p-6 border rounded bg-slate-50 dark:bg-slate-800">
          <p className="mb-4 text-slate-600 dark:text-slate-200">
            You must be signed in to upload a product.
          </p>
          <SignInButton>
            <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded">
              Sign in
            </button>
          </SignInButton>
          <p className="mt-3 text-sm text-slate-500">
            Note: This page is open for demo purposes — secure it before
            production.
          </p>
        </div>
      </SignedOut>

      {/* When signed in */}
      <SignedIn>
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6 border rounded bg-white dark:bg-slate-900 shadow"
        >
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Product Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full border rounded px-3 py-2"
              placeholder="e.g., Pure Olive Oil"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Price (KSh)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              className="block w-full border rounded px-3 py-2"
              placeholder="e.g., 850"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Short Description
            </label>
            <input
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              required
              className="block w-full border rounded px-3 py-2"
              placeholder="e.g., 100% organic oil with healing properties."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full border rounded px-3 py-2"
            >
              <option value="herbs">Herbs</option>
              <option value="oils">Oils</option>
              <option value="foods">Foods</option>
              <option value="egw">EGW Books</option>
              <option value="pioneers">Pioneer Books</option>
              <option value="authors">Other Authors</option>
              <option value="bibles">Bibles</option>
              <option value="covers">Covers</option>
              <option value="songbooks">Song Books</option>
              <option value="authors">Other Authors</option>
             

            </select>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Upload Images (max 3)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full border rounded p-2"
            />
            {files && (
              <div className="mt-2 text-sm text-slate-500">
                {files.length} file(s) selected
              </div>
            )}
            {status === "uploading" && (
              <div className="w-full bg-slate-200 h-2 rounded mt-2">
                <div
                  className="bg-emerald-600 h-2 rounded transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Only the first image will be used as the main product thumbnail.
            </p>
          </div>

          

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={status === "uploading"}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-60"
            >
              {status === "uploading" ? "Uploading..." : "Create Product"}
            </button>

            {status === "success" && (
              <p className="text-emerald-600 mt-2">
                ✅ Product created successfully.
              </p>
            )}
            {status === "error" && (
              <p className="text-rose-600 mt-2">
                ❌ Failed to create product. Check console.
              </p>
            )}
          </div>

          <p className="text-sm text-slate-500 mt-3">
            Security note: `/api/products` should validate admin role or Clerk
            session before writing to Firestore.
          </p>
        </form>
      </SignedIn>
    </div>
  );
}
