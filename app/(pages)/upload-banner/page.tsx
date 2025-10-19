"use client";

import React, { useState } from "react";

export default function UploadBannerPage() {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!files || files.length === 0) {
      alert("Please select a banner image");
      return;
    }

    setStatus("uploading");
    setProgress(0);

    try {
      const uploadedUrls: string[] = [];

      // Upload each file via /api/upload (reusing same working credentials)
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
              uploadedUrls.push(result.url);
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

      // Save banner metadata to Firestore
      const payload = {
        title,
        link,
        imageUrl: uploadedUrls[0],
        createdAt: new Date().toISOString(),
      };

      const response = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save banner metadata");

      setStatus("success");
      setProgress(100);
      setTitle("");
      setLink("");
      setFiles(null);
    } catch (error) {
      console.error("Banner upload failed:", error);
      setStatus("error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Upload Banner</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-6 border rounded bg-white dark:bg-slate-900 shadow"
      >
        {/* Banner Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Banner Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="block w-full border rounded px-3 py-2"
            placeholder="e.g., Special Discount Week"
          />
        </div>

        {/* Optional Link */}
        <div>
          <label className="block text-sm font-medium mb-1">Banner Link (optional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="block w-full border rounded px-3 py-2"
            placeholder="e.g., /products or https://example.com"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">Upload Banner Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFiles(e.target.files)}
            className="block w-full border rounded p-2"
          />
          {files && (
            <div className="mt-2 text-sm text-slate-500">{files.length} file(s) selected</div>
          )}
          {status === "uploading" && (
            <div className="w-full bg-slate-200 h-2 rounded mt-2">
              <div
                className="bg-blue-600 h-2 rounded transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={status === "uploading"}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60"
          >
            {status === "uploading" ? "Uploading..." : "Upload Banner"}
          </button>

          {status === "success" && (
            <p className="text-emerald-600 mt-2">✅ Banner uploaded successfully.</p>
          )}
          {status === "error" && (
            <p className="text-rose-600 mt-2">❌ Failed to upload banner. Check console.</p>
          )}
        </div>
      </form>
    </div>
  );
}
