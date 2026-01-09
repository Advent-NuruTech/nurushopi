"use client";

import { useState } from "react";

function formatText(text: string) {
  const formatted = text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Underline __text__
    .replace(/__(.*?)__/g, "<u>$1</u>")
    // Numbered points
    .replace(/(^|\n)(\d+\.\s.*)/g, "<br /><span>$2</span>");

  return formatted;
}
export default function UploadBannerPage() {
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select an image.");

    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("shortDescription", shortDescription);
    formData.append("link", link);
    formData.append("file", file);

    const res = await fetch("/api/upload-banner", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);
    setMessage(data.message || data.error);
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Upload New Banner
      </h1>

      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-4 border p-6 rounded-xl shadow-md bg-white"
      >
        <input
          type="text"
          placeholder="Banner Title"
          className="border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder="Short Description (supports **bold**, __underline__, 1. points)"
          className="border p-2 rounded min-h-[120px]"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          required
        />

        {/* Live Preview */}
        {shortDescription && (
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-sm font-semibold mb-1 text-gray-600">
              Preview
            </p>
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatText(shortDescription),
              }}
            />
          </div>
        )}

        <input
          type="text"
          placeholder="Link (optional)"
          className="border p-2 rounded"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-2 rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white py-2 rounded hover:bg-gray-800"
        >
          {loading ? "Uploading..." : "Upload Banner"}
        </button>

        {message && (
          <p
            className={`text-center mt-2 ${
              message.includes("success")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
