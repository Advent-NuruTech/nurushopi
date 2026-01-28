"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { AdminRole } from "./types";

const PRODUCT_CATEGORIES = [
  "herbs", "oils", "foods", "egw", "pioneers", "authors", "bibles", "covers", "songbooks", "other",
];

interface ProductsTabProps {
  adminId: string;
  role: AdminRole;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export default function ProductsTab({ adminId, role }: ProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ 
    name: "", 
    price: "", 
    category: "herbs", 
    description: "", 
    imageUrl: "" 
  });

  const load = () => {
    fetch("/api/admin/products", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));
  };

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/products", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/admin/products?id=${id}`, { 
      method: "DELETE", 
      credentials: "include" 
    });
    if (res.ok) setProducts((p) => p.filter((x) => x.id !== id));
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          price: Number(createForm.price) || 0,
          category: createForm.category,
          description: createForm.description,
          images: createForm.imageUrl ? [createForm.imageUrl] : [],
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setCreateForm({ name: "", price: "", category: "herbs", description: "", imageUrl: "" });
        load();
      }
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading products…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Products</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
          >
            Create product
          </button>
          <Link
            href="/admin/dashboard/uploadproduct"
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Upload (full)
          </Link>
        </div>
      </div>

      {showCreate && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <form onSubmit={createProduct} className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <input
              required
              placeholder="Product name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <input
              required
              type="number"
              min={0}
              step={0.01}
              placeholder="Price"
              value={createForm.price}
              onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <select
              value={createForm.category}
              onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              placeholder="Image URL (optional)"
              value={createForm.imageUrl}
              onChange={(e) => setCreateForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <textarea
              placeholder="Description (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
            <div className="sm:col-span-2 flex gap-2">
              <button 
                type="submit" 
                disabled={createLoading} 
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm"
              >
                {createLoading ? "Creating…" : "Create"}
              </button>
              <button 
                type="button" 
                onClick={() => setShowCreate(false)} 
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-sm text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-4 py-2">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded" />
                  )}
                </td>
                
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.category}</td>
                <td className="px-4 py-3">{formatPrice(p.price)}</td>
                <td className="px-4 py-3">
                  <Link 
                    href={`/products/${p.id}`} 
                    className="text-sky-600 dark:text-sky-400 hover:underline text-sm mr-3"
                  >
                    Edit
                  </Link>
                  <button 
                    onClick={() => remove(p.id)} 
                    className="text-red-600 dark:text-red-400 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && (
        <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No products yet.</p>
      )}
    </section>
  );
}