"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { slugifyCategory } from "@/lib/categoryUtils"; // make sure this is imported
import { catalogApi, ApiClientError } from "@/lib/api";
import type { CategoryDTO } from "@nuru/types";

export default function CategoriesTab() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    icon: "",
    imageUrl: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    icon: "",
    imageUrl: "",
    description: "",
  });
  const [uploading, setUploading] = useState(false);

  const uploadCategoryImage = async (file: File, editing = false) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Image upload failed.");
      if (editing) setEditForm((form) => ({ ...form, imageUrl: result.url! }));
      else setCreateForm((form) => ({ ...form, imageUrl: result.url! }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const load = () => {
    setLoading(true);
    catalogApi
      .admin.listCategories()
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]))
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
    try {
      await catalogApi.admin.createCategory({
        name: createForm.name.trim(),
        slug: createForm.slug.trim() || undefined,
        icon: createForm.icon.trim() || null,
        imageUrl: createForm.imageUrl.trim() || null,
        description: createForm.description.trim() || null,
        sortOrder: 0,
      });
      setCreateForm({ name: "", slug: "", icon: "", imageUrl: "", description: "" });
      load();
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    }
  };

  const startEdit = (cat: CategoryDTO) => {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name ?? "",
      slug: cat.slug ?? "",
      icon: cat.icon ?? "",
      imageUrl: cat.imageUrl ?? "",
      description: cat.description ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await catalogApi.admin.updateCategory(editingId, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim() || undefined,
        icon: editForm.icon.trim() || null,
        imageUrl: editForm.imageUrl.trim() || null,
        description: editForm.description.trim() || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    }
  };

  const remove = async (id: string) => {
    if (
      !confirm(
        "Delete this category? Products already assigned will keep their category value."
      )
    )
      return;
    try {
      await catalogApi.admin.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    }
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
            disabled={uploading}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
          >
            Add Category
          </button>

          <label className="sm:col-span-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
            {createForm.imageUrl && (
              <span className="relative h-14 w-14 overflow-hidden rounded-md bg-slate-100">
                <Image src={createForm.imageUrl} alt="Category preview" fill className="object-contain" sizes="56px" />
              </span>
            )}
            <span>{uploading ? "Uploading…" : "Upload category image (optional — latest product image is used if empty)"}</span>
            <input type="file" accept="image/*" disabled={uploading} className="sr-only" onChange={(e) => e.target.files?.[0] && uploadCategoryImage(e.target.files[0])} />
          </label>

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
              <th className="px-4 py-3">Image</th>
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
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-sky-600">
                      {editForm.imageUrl && <span className="relative h-12 w-12 overflow-hidden rounded bg-slate-100"><Image src={editForm.imageUrl} alt="" fill className="object-contain" sizes="48px" /></span>}
                      {uploading ? "Uploading…" : "Change"}
                      <input type="file" accept="image/*" disabled={uploading} className="sr-only" onChange={(e) => e.target.files?.[0] && uploadCategoryImage(e.target.files[0], true)} />
                    </label>
                  ) : (
                    <span className="relative block h-12 w-12 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      <Image src={c.imageUrl || "/assets/logo.png"} alt="" fill className="object-contain" sizes="48px" />
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
