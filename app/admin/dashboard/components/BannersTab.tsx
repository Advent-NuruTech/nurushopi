"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Banner {
  id: string;
  imageUrl: string;
  link: string;
}

export default function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/banners", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBanners(d.banners ?? []))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const res = await fetch(`/api/admin/banners?id=${id}`, { 
      method: "DELETE", 
      credentials: "include" 
    });
    if (res.ok) setBanners((b) => b.filter((x) => x.id !== id));
  };

  if (loading) return <LoadingSpinner text="Loading banners…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Banners</h2>
        <Link 
          href="//admin/dashboard/upload/upload-banner"
          
          
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
        >
          Add banner
        </Link>
      </div>
      <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((b) => (
          <div key={b.id} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {b.imageUrl && <img src={b.imageUrl} alt="" className="w-full h-32 object-cover" />}
            <div className="p-3 flex justify-between items-center">
              <a 
                href={b.link || "#"} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sky-600 dark:text-sky-400 text-sm truncate max-w-[200px]"
              >
                {b.link || "No link"}
              </a>
              <button 
                onClick={() => remove(b.id)} 
                className="text-red-600 dark:text-red-400 hover:underline text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {banners.length === 0 && (
        <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No banners.</p>
      )}
    </section>
  );
}