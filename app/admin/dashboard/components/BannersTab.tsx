"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Banner {
  id: string;
  title: string;
  shortDescription: string;
  imageUrl: string;
  link: string;
}

export default function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [filtered, setFiltered] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ---------------- Fetch banners ---------------- */
  useEffect(() => {
    fetch("/api/admin/banners", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const allBanners: Banner[] = d.banners ?? [];
        setBanners(allBanners);
        setFiltered(allBanners);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---------------- Search filter ---------------- */
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(banners);
      return;
    }

    const query = search.toLowerCase();
    setFiltered(
      banners.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.shortDescription.toLowerCase().includes(query)
      )
    );
  }, [search, banners]);

  /* ---------------- Remove banner ---------------- */
  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;

    const res = await fetch(`/api/admin/banners?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setBanners((prev) => prev.filter((b) => b.id !== id));
      setFiltered((prev) => prev.filter((b) => b.id !== id));
    }
  };

  if (loading) return <LoadingSpinner text="Loading banners…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-semibold">Banners</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total banners: {banners.length}
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search banners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <Link
            href="/admin/dashboard/upload-banner"
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm"
          >
            Add banner
          </Link>
        </div>
      </div>

      {/* Banner grid */}
      <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800"
          >
            <img
              src={b.imageUrl}
              alt={b.title}
              className="w-full h-32 object-cover"
            />

            <div className="p-3 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                {b.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                {b.shortDescription || "No description"}
              </p>

              <a
                href={b.link || "#"}
                target="_blank"
                className="text-sky-600 text-sm block truncate"
              >
                {b.link || "No link"}
              </a>

              <div className="flex justify-between text-sm mt-2">
                <Link
                  href={`/admin/dashboard/banners/${b.id}/edit`}
                  className="text-emerald-600 hover:underline"
                >
                  Edit
                </Link>

                <button
                  onClick={() => remove(b.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No banners */}
      {filtered.length === 0 && (
        <p className="p-6 text-center text-slate-500">No banners found.</p>
      )}
    </section>
  );
}
