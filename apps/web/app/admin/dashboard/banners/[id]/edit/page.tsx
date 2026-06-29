"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { catalogApi, ApiClientError } from "@/lib/api";

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

  /* ---------------- Fetch banner ---------------- */
  useEffect(() => {
    async function load() {
      try {
        const { banners } = await catalogApi.admin.listBanners();
        const banner = banners.find((b) => b.id === id);
        if (banner) {
          setTitle(banner.title || "");
          setShortDescription(banner.subtitle || "");
          setLink(banner.linkUrl || "");
          setImageUrl(banner.imageUrl || "");
        }
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

      await catalogApi.admin.updateBanner(id, {
        title: title.trim() || null,
        subtitle: shortDescription.trim() || null,
        linkUrl: finalLink || null,
        imageUrl,
      });

      alert("Banner updated");
      router.push(adminRoute(ADMIN_DASHBOARD_PATH));
    } catch (e) {
      console.error(e);
      alert(e instanceof ApiClientError ? e.message : "Update failed");
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
