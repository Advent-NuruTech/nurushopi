"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { AdminRole } from "./types";
import { Edit, Trash2, Eye, Image as ImageIcon } from "lucide-react";

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
  images?: string[];
  coverImage?: string;
}

export default function ProductsTab({}: ProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [search, setSearch] = useState("");

  /* ---------- Detect system dark mode ---------- */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const loadProducts = () => {
    setLoading(true);
    fetch("/api/admin/products", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const res = await fetch(`/api/admin/products?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setProducts((p) => p.filter((x) => x.id !== id));
    }
  };

  const viewImages = (product: Product) => {
    setSelectedProduct(product);
    setShowImageModal(true);
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = String(p.name ?? "").toLowerCase();
      const category = String(p.category ?? "").toLowerCase();
      return (
        name.includes(q) ||
        category.includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  if (loading) return <LoadingSpinner text="Loading products..." />;

  return (
    <div className={`min-h-screen transition-colors duration-300 py-8 px-4 ${
      darkMode 
        ? "bg-gray-900 text-gray-100" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <div className="max-w-7xl mx-auto">
        <section className={`rounded-2xl shadow-lg border overflow-hidden transition-colors duration-300 ${
          darkMode 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-200"
        }`}>
          <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300 ${
            darkMode 
              ? "border-gray-700" 
              : "border-gray-200"
          }`}>
            <div>
              <h2 className={`text-2xl font-bold ${
                darkMode ? "text-gray-100" : "text-gray-900"
              }`}>
                Products Management
              </h2>
              <p className={`mt-1 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Manage your store products and inventory
              </p>
              <p className={`mt-1 text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                Total: {products.length} | Showing: {filteredProducts.length}
              </p>
            </div>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, category, or ID..."
                className={`w-full sm:w-72 px-3 py-2 rounded-lg border text-sm ${
                  darkMode
                    ? "bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                }`}
              />
              <Link
                href="/admin/dashboard/uploadproduct"
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <span>+</span>
                Upload Product
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`text-left transition-colors duration-300 ${
                darkMode 
                  ? "bg-gray-700/50 text-gray-300" 
                  : "bg-gray-50 text-gray-600"
              }`}>
                <tr>
                  <th className="px-6 py-4 font-medium">Image</th>
                  <th className="px-6 py-4 font-medium">Product Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((p) => (
                  <tr 
                    key={p.id} 
                    className={`border-t transition-colors duration-300 hover:${
                      darkMode ? "bg-gray-700/30" : "bg-gray-50"
                    } ${darkMode ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {p.imageUrl || p.coverImage ? (
                            <img
                              src={p.imageUrl || p.coverImage}
                              alt={p.name}
                              className="w-16 h-16 object-cover rounded-lg shadow"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = `w-16 h-16 rounded-lg flex items-center justify-center ${
                                    darkMode ? "bg-gray-700" : "bg-gray-100"
                                  }`;
                                  fallback.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>';
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                              darkMode ? "bg-gray-700" : "bg-gray-100"
                            }`}>
                              <ImageIcon className={`w-8 h-8 ${
                                darkMode ? "text-gray-500" : "text-gray-400"
                              }`} />
                            </div>
                          )}
                          {p.images && p.images.length > 0 && (
                            <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              darkMode 
                                ? "bg-blue-600 text-white" 
                                : "bg-blue-500 text-white"
                            }`}>
                              {p.images.length}
                            </div>
                          )}
                        </div>
                        {(p.images && p.images.length > 0) && (
                          <button
                            onClick={() => viewImages(p)}
                            className={`text-sm px-3 py-1 rounded-md transition-colors duration-300 ${
                              darkMode 
                                ? "bg-gray-700 hover:bg-gray-600 text-gray-300" 
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            }`}
                          >
                            View {p.images.length} image{p.images.length > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <div className={`font-semibold ${
                          darkMode ? "text-gray-100" : "text-gray-900"
                        }`}>
                          {p.name}
                        </div>
                        <div className={`text-xs mt-1 ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}>
                          ID: {p.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        darkMode 
                          ? "bg-gray-700 text-gray-300" 
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {p.category}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className={`text-lg font-bold ${
                        darkMode ? "text-green-400" : "text-green-600"
                      }`}>
                        {formatPrice(p.price)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/admin/dashboard/products/${p.id}`}
                          className={`p-2 rounded-lg transition-colors duration-300 ${
                            darkMode 
                              ? "text-blue-400 hover:bg-gray-700" 
                              : "text-blue-600 hover:bg-gray-100"
                          }`}
                          title="Edit Product"
                        >
                          <Edit size={18} />
                        </Link>

                        <button
                          onClick={() => viewImages(p)}
                          className={`p-2 rounded-lg transition-colors duration-300 ${
                            darkMode 
                              ? "text-gray-400 hover:bg-gray-700" 
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title="View Images"
                          disabled={!p.images || p.images.length === 0}
                        >
                          <Eye size={18} />
                        </button>

                        <button
                          onClick={() => remove(p.id)}
                          className={`p-2 rounded-lg transition-colors duration-300 ${
                            darkMode 
                              ? "text-red-400 hover:bg-gray-700" 
                              : "text-red-600 hover:bg-gray-100"
                          }`}
                          title="Delete Product"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className={`p-12 text-center transition-colors duration-300 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}>
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}>
                <ImageIcon className={`w-12 h-12 ${
                  darkMode ? "text-gray-600" : "text-gray-400"
                }`} />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                {products.length === 0 ? "No Products Yet" : "No Matching Products"}
              </h3>
              <p className="mb-6 max-w-md mx-auto">
                {products.length === 0
                  ? "Start adding products to your store to display them here."
                  : "Try a different search term to find products."}
              </p>
              {products.length === 0 && (
                <Link
                  href="/admin/dashboard/uploadproduct"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <span>+</span>
                  Upload Your First Product
                </Link>
              )}
            </div>
          )}

          {products.length > 0 && (
            <div className={`px-6 py-4 border-t flex items-center justify-between transition-colors duration-300 ${
              darkMode 
                ? "border-gray-700 text-gray-400" 
                : "border-gray-200 text-gray-600"
            }`}>
              <div className="text-sm">
                Showing <span className="font-semibold">{filteredProducts.length}</span> of{" "}
                <span className="font-semibold">{products.length}</span> product{products.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={loadProducts}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                  darkMode 
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-300" 
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Refresh Products
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Image Gallery Modal */}
      {showImageModal && selectedProduct && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-300 ${
          darkMode ? "bg-gray-900/90" : "bg-white/90"
        } backdrop-blur-sm`} onClick={() => setShowImageModal(false)}>
          <div 
            className={`relative w-full max-w-4xl rounded-2xl shadow-2xl transition-colors duration-300 ${
              darkMode 
                ? "bg-gray-800 border border-gray-700" 
                : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b flex justify-between items-center transition-colors duration-300 ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? "text-gray-100" : "text-gray-900"
                }`}>
                  {selectedProduct.name}
                </h3>
                <p className={`mt-1 text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  Product Images ({selectedProduct.images?.length || 0})
                </p>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className={`p-2 rounded-lg transition-colors duration-300 ${
                  darkMode 
                    ? "hover:bg-gray-700 text-gray-400" 
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Main Image */}
              <div className="mb-8">
                <h4 className={`text-lg font-semibold mb-4 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Homepage Image
                </h4>
                <div className="relative rounded-xl overflow-hidden bg-gray-900">
                  <img
                    src={selectedProduct.coverImage || selectedProduct.imageUrl}
                    alt={`${selectedProduct.name} - Main`}
                    className="w-full h-80 object-contain bg-gray-900"
                    onError={(e) => {
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.className = parent.className.replace('bg-gray-900', darkMode ? 'bg-gray-700' : 'bg-gray-100');
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = `w-full h-80 flex flex-col items-center justify-center ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        }`;
                        fallback.innerHTML = `
                          <svg class="w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                          </svg>
                          <p class="mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}">Image not available</p>
                        `;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Gallery Images */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div>
                  <h4 className={`text-lg font-semibold mb-4 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Gallery Images ({selectedProduct.images.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedProduct.images.map((img, index) => (
                      <div 
                        key={index} 
                        className={`relative rounded-lg overflow-hidden aspect-square ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${selectedProduct.name} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className = `w-full h-full flex flex-col items-center justify-center ${
                                darkMode ? "bg-gray-700" : "bg-gray-100"
                              }`;
                              fallback.innerHTML = `
                                <svg class="w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                                </svg>
                              `;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${
                          darkMode 
                            ? "bg-gray-800/90 text-gray-300" 
                            : "bg-white/90 text-gray-700"
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
