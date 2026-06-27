"use client";

import { useState } from "react";
import { formatText } from "@/lib/formatText";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function UploadBannerPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  /* ---------------- Upload image ---------------- */
  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data: { url?: string } = await res.json();

    if (!data.url) throw new Error("Upload failed");

    setImageUrl(data.url);
    return data.url;
  }

  /* ---------------- Normalize link ---------------- */
  function normalizeLink(rawLink: string) {
    const trimmed = rawLink.trim();
    if (!trimmed) return "";
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  /* ---------------- Handle form submission ---------------- */
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return alert("Please select an image.");

    setLoading(true);
    setMessage("");

    try {
      // Upload image
      const uploadedUrl = await uploadImage(file);

      const finalLink = normalizeLink(link);

      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortDescription: description,
          link: finalLink,
          imageUrl: uploadedUrl,
        }),
      });

      const data: { success?: boolean; message?: string; id?: string } =
        await res.json();

      if (!data.success) {
        throw new Error(data.message || "Upload failed");
      }

      setMessage("Banner uploaded successfully!");
      setTitle("");
      setDescription("");
      setLink("");
      setFile(null);
      setImageUrl(null);

      router.push(`/banners/${data.id}`);
    } catch (e: unknown) {
      console.error(e);

      const errorMessage =
        e instanceof Error ? e.message : "Upload failed. Try again.";

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
        Upload New Banner
      </h1>

      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-4 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-md bg-white dark:bg-gray-900"
      >
        {/* Title */}
        <input
          type="text"
          placeholder="Banner Title"
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Description */}
        <textarea
          placeholder="Full Description..."
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded min-h-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Preview */}
        {description && (
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800">
            <p className="text-sm font-semibold mb-2">Live Preview</p>

            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: formatText(description),
              }}
            />
          </div>
        )}

        {/* Link */}
        <input
          type="text"
          placeholder="Link (optional)"
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        {/* Image */}
        <div>
          <p className="mb-2">Banner Image</p>

          {imageUrl && (
            <div className="relative mb-2 w-full h-48">
              <Image
                src={imageUrl}
                alt="banner preview"
                fill
                className="rounded object-cover"
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-2 rounded"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 rounded font-medium hover:opacity-90 disabled:opacity-60 transition"
        >
          {loading ? "Uploading..." : "Upload Banner"}
        </button>

        {message && (
          <p className="text-center mt-2 text-sm">{message}</p>
        )}
      </form>
    </div>
  );
}
