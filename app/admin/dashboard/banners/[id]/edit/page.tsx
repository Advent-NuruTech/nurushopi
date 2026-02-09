"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function EditBannerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [oldImageUrl, setOldImageUrl] = useState("");

  /* ---------------- Fetch banner ---------------- */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/banners?id=${id}`);
        const data = await res.json();

        const banner = data.banner;

        setTitle(banner.title || "");
        setShortDescription(banner.shortDescription || "");
        setLink(banner.link || "");
        setImageUrl(banner.imageUrl || "");
        setOldImageUrl(banner.imageUrl || "");
      } catch (e) {
        console.error("Load failed", e);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  /* ---------------- Upload image ---------------- */
  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!data.url) throw new Error("Upload failed");

    setImageUrl(data.url);
  }

  /* ---------------- Normalize link ---------------- */
  function normalizeLink(rawLink: string) {
    const trimmed = rawLink.trim();

    if (!trimmed) return "";

    if (
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("https://")
    ) {
      return `https://${trimmed}`;
    }

    return trimmed;
  }

  /* ---------------- Save banner ---------------- */
  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);

      const finalLink = normalizeLink(link);

      const res = await fetch("/api/admin/banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          shortDescription,
          link: finalLink,
          imageUrl,
          oldImageUrl,
        }),
      });

      const data = await res.json();

      if (!data.success) throw new Error("Update failed");

      alert("Banner updated");
      router.push("/admin/dashboard");
    } catch (e) {
      console.error(e);
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading banner...</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">Edit Banner</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <input
          className="border p-2 w-full"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="border p-2 w-full"
          placeholder="Short Description"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <div>
          <p className="mb-2">Banner Image</p>

          {imageUrl && (
            <div className="relative mb-2 w-full h-48">
              <Image
                src={imageUrl}
                alt="banner"
                fill
                className="rounded object-cover"
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files && uploadImage(e.target.files[0])
            }
          />
        </div>

        <button
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {saving ? "Saving..." : "Update Banner"}
        </button>
      </form>
    </div>
  );
}
