"use client";

import { useState } from "react";
import { formatText } from "@/lib/formatText";
import { useRouter } from "next/navigation";

export default function UploadBannerPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return alert("Please select an image.");

    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("link", link);
    formData.append("file", file);

    const res = await fetch("/api/upload-banner", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    // ✅ Check if upload succeeded
    if (res.ok && data.id) {
      setMessage("Banner uploaded successfully!");

      // Clear form
      setTitle("");
      setDescription("");
      setLink("");
      setFile(null);

      // Optional: redirect to banner detail page
      router.push(`/banners/${data.id}`);
    } else {
      setMessage(data.message || data.error || "Upload failed. Try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
        Upload New Banner
      </h1>

      <form
        onSubmit={handleUpload}
        className="
          flex flex-col gap-4
          border border-gray-200 dark:border-gray-800
          p-6 rounded-xl shadow-md
          bg-white dark:bg-gray-900
        "
      >
        <input
          type="text"
          placeholder="Banner Title"
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder={`Full Description
Supports:
## Headings
**Bold**
__Underline__
1. Numbered lists
- Bullet lists

(Use blank lines for paragraphs)
`}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 p-3 rounded min-h-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {description && (
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800">
            <p className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">
              Live Preview
            </p>

            <div
              className="prose prose-sm max-w-none text-gray-800 dark:text-gray-100 dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: formatText(description),
              }}
            />
          </div>
        )}

        <input
          type="text"
          placeholder="Link (optional)"
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-2 rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black dark:bg-white text-white dark:text-black py-2 rounded font-medium hover:opacity-90 disabled:opacity-60 transition"
        >
          {loading ? "Uploading..." : "Upload Banner"}
        </button>

        {message && (
          <p className="text-center mt-2 text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
