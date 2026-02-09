"use client";

import React, { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { slugifyCategory } from "@/lib/categoryUtils"; // make sure this is imported

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    icon: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    icon: "",
    description: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/admin/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) =>
      `${c.name} ${c.slug}`.toLowerCase().includes(needle)
    );
  }, [categories, query]);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    if (res.ok) {
      setCreateForm({ name: "", slug: "", icon: "", description: "" });
      load();
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name ?? "",
      slug: cat.slug ?? "",
      icon: cat.icon ?? "",
      description: cat.description ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const res = await fetch("/api/admin/categories", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    }
  };

  const remove = async (id: string) => {
    if (
      !confirm(
        "Delete this category? Products already assigned will keep their category value."
      )
    )
      return;
    const res = await fetch(`/api/admin/categories?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) return <LoadingSpinner text="Loading categories..." />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Category Management
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add, edit, or remove categories. Deleting a category does not change
          existing products.
        </p>
      </div>

      {/* Create Form */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <form onSubmit={createCategory} className="grid gap-3 sm:grid-cols-4">
          <input
            required
            placeholder="Category name"
            value={createForm.name}
            onChange={(e) => {
              const name = e.target.value;
              setCreateForm((f) => ({
                ...f,
                name,
                slug: slugifyCategory(name),
              }));
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />

          <input
            placeholder="Slug (auto-generated)"
            value={createForm.slug}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, slug: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />

          <input
            placeholder="Icon (optional)"
            value={createForm.icon}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, icon: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
          >
            Add Category
          </button>

          <textarea
            placeholder="Description (optional)"
            value={createForm.description}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={2}
            className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
          />
        </form>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <input
          placeholder="Search categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      {/* Category Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-sm text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Icon</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-t border-slate-200 dark:border-slate-700"
              >
                <td className="px-4 py-3">
                  {editingId === c.id ? (
                    <input
                      value={editForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setEditForm((f) => ({
                          ...f,
                          name,
                          slug: slugifyCategory(name),
                        }));
                      }}
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  ) : (
                    <span className="font-medium text-slate-900 dark:text-white">
                      {c.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === c.id ? (
                    <input
                      value={editForm.slug}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, slug: e.target.value }))
                      }
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">
                      {c.slug}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === c.id ? (
                    <input
                      value={editForm.icon}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, icon: e.target.value }))
                      }
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">
                      {c.icon || "-"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === c.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-600 dark:text-slate-400 hover:underline text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-sky-600 dark:text-sky-400 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="text-red-600 dark:text-red-400 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="p-6 text-slate-500 dark:text-slate-400 text-center">
          No categories found.
        </p>
      )}
    </section>
  );
}
