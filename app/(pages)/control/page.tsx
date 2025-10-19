'use client';

import { useEffect, useState } from "react";
import { getAllProducts, deleteProduct } from "@/lib/firestoreHelpers";
import type { Product } from "@/lib/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit, Trash2, Plus, Filter, Search } from "lucide-react";

export default function ControlPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const categories: { value: string; label: string }[] = [
    { value: "all", label: "All Categories" },
    { value: "herbs", label: "Remedies" },
    { value: "oils", label: "Oils" },
    { value: "foods", label: "Healthy Foods" },
    { value: "egw", label: "E.G. White Books" },
    { value: "pioneers", label: "Pioneer Writings" },
    { value: "authors", label: "Other  Trusted Authors" },
    { value: "bibles", label: "Bibles" },
    { value: "covers", label: "Covers" },
    { value: "songbooks", label: "Song Books" },
  ];

  // --- Load all products ---
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data: Product[] = await getAllProducts();
        // Add missing shortDescription safely
        const normalizedData = data.map((p: Product): Product => ({
          ...p,
          shortDescription: p.shortDescription ?? "",
        }));
        setProducts(normalizedData);
        setFiltered(normalizedData);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // --- Handle delete ---
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setFiltered((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        console.error("Failed to delete product:", err);
      }
    }
  };

  // --- Filter products ---
  useEffect(() => {
    let filteredList = [...products];
    if (category !== "all") {
      filteredList = filteredList.filter((p) => p.category === category);
    }
    if (search.trim() !== "") {
      filteredList = filteredList.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(filteredList);
  }, [category, search, products]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <LoadingSpinner text="Loading all products..." />
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">NuruShop Admin</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage all your uploaded products easily.
          </p>
        </div>
        <Link href="/uploadproduct">
          <Button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="text-sky-600 w-4 h-4" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="flex items-center w-full sm:w-64 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-gray-700 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Category Info */}
      <div className="text-gray-600 dark:text-gray-300 mb-4">
        Showing <span className="font-semibold">{filtered.length}</span> product(s)
        {category !== "all" && (
          <>
            {" "}
            in <span className="font-semibold">{category}</span> category
          </>
        )}
        .
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-10">
          No products found for this selection.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow bg-white dark:bg-gray-800">
          <table className="min-w-full border-collapse">
            <thead className="bg-sky-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase text-sm">
              <tr>
                <th className="px-4 py-3 text-left">Image</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-sky-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-4 py-2">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-14 h-14 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-600 rounded-md" />
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 capitalize">{p.category}</td>
                  <td className="px-4 py-2">KSh {p.price.toLocaleString()}</td>
                  <td className="px-4 py-2 flex justify-center gap-2">
                    <Link href={`/products/${p.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-sky-600 text-sky-600 hover:bg-sky-100"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
