"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Package,
  ShoppingCart,
  Image as ImageIcon,
  MessageSquare,
  LogOut,
  Copy,
  Loader2,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";

type AdminRole = "senior" | "sub";
type TabId = "invite" | "admins" | "products" | "orders" | "banners" | "contacts";

interface Admin {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
}

const TABS_SENIOR: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "invite", label: "Invite Admin", icon: <UserPlus size={18} /> },
  { id: "admins", label: "Admin Management", icon: <Users size={18} /> },
  { id: "products", label: "Products", icon: <Package size={18} /> },
  { id: "orders", label: "Orders", icon: <ShoppingCart size={18} /> },
  { id: "banners", label: "Banners", icon: <ImageIcon size={18} /> },
  { id: "contacts", label: "Contacts", icon: <MessageSquare size={18} /> },
];
const TABS_SUB: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "products", label: "Products", icon: <Package size={18} /> },
  { id: "orders", label: "Orders", icon: <ShoppingCart size={18} /> },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("products");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => {
        if (cancelled) return null;
        if (r.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data?.admin) return;
        setAdmin(data.admin);
        setTab(data.admin.role === "sub" ? "products" : "products");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  };

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={48} text="Loading…" />
      </div>
    );
  }

  const tabs = admin.role === "senior" ? TABS_SENIOR : TABS_SUB;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard size={24} className="text-sky-600" />
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">NuruShop Admin</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {admin.name} · {admin.role === "senior" ? "Senior Admin" : "Sub Admin"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-sky-600"
            >
              View site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {tab === "invite" && admin.role === "senior" && (
          <InviteTab />
        )}
        {tab === "admins" && admin.role === "senior" && (
          <AdminsTab />
        )}
        {tab === "products" && <ProductsTab adminId={admin.adminId} role={admin.role} />}
        {tab === "orders" && <OrdersTab adminId={admin.adminId} role={admin.role} />}
        {tab === "banners" && admin.role === "senior" && <BannersTab />}
        {tab === "contacts" && admin.role === "senior" && <ContactsTab />}
      </main>
    </div>
  );
}

function InviteTab() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setLink("");
    try {
      const res = await fetch("/api/admin/auth/invite", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setLink(data.link ?? "");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Invite Admin</h2>
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
        Generate a link to invite a new Sub Admin. They will use this link to sign up.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
          Generate invite link
        </button>
        {link && (
          <div className="flex-1 min-w-0 flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <button
              onClick={copy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200"
            >
              <Copy size={18} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminsTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/admins", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAdmins(d.admins ?? []))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (adminId: string) => {
    if (!confirm("Remove this admin? They will no longer be able to sign in.")) return;
    const res = await fetch(`/api/admin/admins?adminId=${adminId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) setAdmins((prev) => prev.filter((a) => a.adminId !== adminId));
  };

  if (loading) return <LoadingSpinner text="Loading admins…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Admin Management</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">{admins.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-sm text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.adminId} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{a.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    a.role === "senior" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {a.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.role === "sub" && (
                    <button
                      onClick={() => remove(a.adminId)}
                      className="text-red-600 dark:text-red-400 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const PRODUCT_CATEGORIES = [
  "herbs", "oils", "foods", "egw", "pioneers", "authors", "bibles", "covers", "songbooks", "other",
];

function ProductsTab({ adminId, role }: { adminId: string; role: AdminRole }) {
  const [products, setProducts] = useState<{ id: string; name: string; price: number; category: string; imageUrl?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", price: "", category: "herbs", description: "", imageUrl: "" });

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
    const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE", credentials: "include" });
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
            href="/uploadproduct"
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
              <button type="submit" disabled={createLoading} className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm">
                {createLoading ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm">
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
                  <Link href={`/products/${p.id}`} className="text-sky-600 dark:text-sky-400 hover:underline text-sm mr-3">Edit</Link>
                  <button onClick={() => remove(p.id)} className="text-red-600 dark:text-red-400 hover:underline text-sm">Delete</button>
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

function OrdersTab({ role }: { adminId: string; role: AdminRole }) {
  const [orders, setOrders] = useState<{
    id: string;
    name: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items?: { name?: string; quantity?: number; price?: number }[];
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const approve = async (orderId: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "approved" }),
    });
    if (res.ok) setOrders((o) => o.map((x) => (x.id === orderId ? { ...x, status: "received" } : x)));
  };

  if (loading) return <LoadingSpinner text="Loading orders…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Orders</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {role === "sub" ? "Orders that include your products." : "All orders. Only Senior Admin can approve."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-sm text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              {role === "senior" && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">#{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{o.name}</td>
                <td className="px-4 py-3">{formatPrice(o.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    o.status === "received" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                    o.status === "cancelled" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" :
                    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}>
                    {o.status === "received" ? "Approved" : o.status}
                  </span>
                </td>
                {role === "senior" && (
                  <td className="px-4 py-3">
                    {o.status !== "received" && o.status !== "cancelled" && (
                      <button
                        onClick={() => approve(o.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 && (
        <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No orders.</p>
      )}
    </section>
  );
}

function BannersTab() {
  const [banners, setBanners] = useState<{ id: string; imageUrl: string; link: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/banners", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBanners(d.banners ?? []))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const res = await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setBanners((b) => b.filter((x) => x.id !== id));
  };

  if (loading) return <LoadingSpinner text="Loading banners…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Banners</h2>
        <Link href="/upload-banner" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium">
          Add banner
        </Link>
      </div>
      <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((b) => (
          <div key={b.id} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {b.imageUrl && <img src={b.imageUrl} alt="" className="w-full h-32 object-cover" />}
            <div className="p-3 flex justify-between items-center">
              <a href={b.link || "#"} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 text-sm truncate max-w-[200px]">
                {b.link || "No link"}
              </a>
              <button onClick={() => remove(b.id)} className="text-red-600 dark:text-red-400 hover:underline text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
      {banners.length === 0 && <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No banners.</p>}
    </section>
  );
}

function ContactsTab() {
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string; message: string; read: boolean; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/contacts", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleRead = async (id: string, read: boolean) => {
    const res = await fetch("/api/admin/contacts", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    });
    if (res.ok) setContacts((c) => c.map((x) => (x.id === id ? { ...x, read } : x)));
  };

  if (loading) return <LoadingSpinner text="Loading contacts…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact messages</h2>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {contacts.map((c) => (
          <div key={c.id} className={`p-4 ${!c.read ? "bg-sky-50/50 dark:bg-sky-900/10" : ""}`}>
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{c.email}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.message}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => toggleRead(c.id, !c.read)}
                className="text-sm text-sky-600 dark:text-sky-400 hover:underline shrink-0"
              >
                {c.read ? "Mark unread" : "Mark read"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {contacts.length === 0 && <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No messages.</p>}
    </section>
  );
}
