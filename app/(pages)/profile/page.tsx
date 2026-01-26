"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  auth,
} from "@/lib/firebase";
import { onAuthStateChanged, updateProfile, User } from "firebase/auth";
import {
  getUserProfile,
  updateUserProfile,
  incrementInviteCount,
  type UserProfile,
} from "@/lib/firestoreHelpers";
import { formatPrice } from "@/lib/formatPrice";
import { useAppUser } from "@/context/UserContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  User as UserIcon,
  MapPin,
  Phone,
  Share2,
  Copy,
  MessageCircle,
  ExternalLink,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type OrderStatusFilter = "all" | "pending" | "received" | "cancelled";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ApiOrder {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  country: string;
  county: string;
  locality: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    received: "Delivered",
    cancelled: "Cancelled",
  };
  return map[s] ?? s;
}

function statusBadgeClass(s: string): string {
  switch (s) {
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "received":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
}

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------
export default function ProfilePage() {
  const { user: appUser, isLoading: userLoading } = useAppUser();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  // Update profile form
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Invite
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);

  const uid = firebaseUser?.uid ?? appUser?.id ?? null;

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsub();
  }, []);

  // Fetch profile from Firestore
  const loadProfile = useCallback(async (id: string) => {
    setProfileLoading(true);
    try {
      const p = await getUserProfile(id);
      setProfile(p ?? null);
      setEditFullName(p?.fullName ?? appUser?.name ?? "");
      setEditPhone(p?.phone ?? "");
      setEditAddress(p?.address ?? "");
      setInviteCount(p?.inviteCount ?? 0);
    } catch {
      setMessage({ type: "error", text: "Failed to load profile." });
    } finally {
      setProfileLoading(false);
    }
  }, [appUser?.name]);

  useEffect(() => {
    if (uid) {
      loadProfile(uid);
    } else {
      setProfileLoading(false);
    }
  }, [uid, loadProfile]);

  // Fetch orders
  useEffect(() => {
    if (!uid) {
      setOrdersLoading(false);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    fetch(`/api/orders?userId=${uid}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOrders(data.orders ?? []);
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: "error", text: "Failed to load orders." });
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => { cancelled = true; };
  }, [uid]);

  // Sync edit form when appUser or profile loads
  useEffect(() => {
    if (appUser?.name && !profile?.fullName) setEditFullName(appUser.name);
    if (profile) {
      setEditFullName(profile.fullName ?? appUser?.name ?? "");
      setEditPhone(profile.phone ?? "");
      setEditAddress(profile.address ?? "");
      setInviteCount(profile.inviteCount ?? 0);
    }
  }, [appUser?.name, profile]);

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    return o.status === orderFilter;
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const deliveredOrders = orders.filter((o) => o.status === "received").length;

  const handleSaveProfile = async () => {
    if (!uid) return;
    setShowConfirmModal(false);
    setSaving(true);
    setMessage(null);
    try {
      await updateUserProfile(uid, {
        fullName: editFullName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      if (firebaseUser && editFullName.trim() && editFullName !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName: editFullName.trim() });
      }
      setProfile((p) => ({
        ...p,
        fullName: editFullName.trim() || p?.fullName,
        phone: editPhone.trim() || p?.phone,
        address: editAddress.trim() || p?.address,
      }));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch {
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/shop${uid ? `?ref=${uid}` : ""}`
    : "";

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      if (uid) await incrementInviteCount(uid);
      setInviteCount((c) => c + 1);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setMessage({ type: "error", text: "Could not copy link." });
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Shop natural health & truth products at NuruShop: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    if (uid) incrementInviteCount(uid).then(() => setInviteCount((c) => c + 1));
  };

  const shareSms = () => {
    const body = encodeURIComponent(`Shop at NuruShop: ${inviteLink}`);
    window.open(`sms:?body=${body}`, "_blank");
    if (uid) incrementInviteCount(uid).then(() => setInviteCount((c) => c + 1));
  };

  // Dismiss message after 4s
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (userLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size={48} text="Loading…" />
      </div>
    );
  }

  if (!appUser && !firebaseUser) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
          <UserIcon className="w-14 h-14 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
            Sign in to view your profile
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You need to be signed in to manage orders and profile.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile?.fullName || appUser?.name || firebaseUser?.displayName || "User";
  const email = appUser?.email || firebaseUser?.email || "";
  const avatarUrl = appUser?.imageUrl || firebaseUser?.photoURL || "/assets/logo.jpg";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white transition-colors">
          User Profile
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your account, orders, and invite others to NuruShop.
        </p>
      </div>

      {/* Toast message */}
      {message && (
        <div
          role="alert"
          className={`rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-all duration-300 ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 1) Profile Overview */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <UserIcon size={20} />
            Profile Overview
          </h2>
          {profileLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size={36} />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative shrink-0">
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="rounded-2xl object-cover ring-2 ring-sky-500/30 dark:ring-sky-400/30"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                  {displayName}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-1 break-all">{email}</p>
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Package size={18} />
                    <span className="font-medium">{totalOrders}</span>
                    <span className="text-sm">Total orders</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                    <Clock size={18} />
                    <span className="font-medium">{pendingOrders}</span>
                    <span className="text-sm">Pending</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 size={18} />
                    <span className="font-medium">{deliveredOrders}</span>
                    <span className="text-sm">Delivered</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2) Manage Orders */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Package size={20} />
            Manage Orders
          </h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {(["all", "pending", "received", "cancelled"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setOrderFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  orderFilter === f
                    ? "bg-sky-600 text-white hover:bg-sky-700"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {f === "all" ? "All" : statusLabel(f)}
              </button>
            ))}
          </div>
          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size={40} text="Loading orders…" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 py-8 text-center">
              No orders found.
            </p>
          ) : (
            <ul className="space-y-4">
              {filteredOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-sky-300 dark:hover:border-sky-600 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(
                        order.status
                      )}`}
                    >
                      {order.status === "received" ? (
                        <CheckCircle2 size={14} className="mr-1" />
                      ) : order.status === "cancelled" ? (
                        <XCircle size={14} className="mr-1" />
                      ) : null}
                      {statusLabel(order.status)}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      View details
                      <ChevronDown size={16} className="rotate-[-90deg]" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 3) Update Profile */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <UserIcon size={20} />
            Update Profile
          </h2>
          <div className="grid gap-4 sm:grid-cols-1 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full name
              </label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone size={14} />
                Phone number
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g. +254..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin size={14} />
                Address
              </label>
              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Street, county, country"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-400 transition-colors resize-none"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size={20} />
                  Saving…
                </span>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 4) Invite Others */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Share2 size={20} />
            Invite Others
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Share NuruShop with friends. They’ll get a link to start shopping.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm"
            />
            <button
              type="button"
              onClick={copyInviteLink}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium transition-colors"
            >
              <Copy size={18} />
              {inviteCopied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={shareWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium transition-colors"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={shareSms}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              <MessageCircle size={18} />
              SMS
            </button>
          </div>
          {inviteCount > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
              Invites shared: <span className="font-medium text-slate-700 dark:text-slate-300">{inviteCount}</span>
            </p>
          )}
        </div>
      </section>

      {/* Confirm save modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-6">
            <h3 id="confirm-title" className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Save profile changes?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Your name, phone, and address will be updated.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order details modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-title"
        >
          <div className="w-full max-w-lg my-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 id="order-detail-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                Order #{selectedOrder.id.slice(0, 8)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="text-slate-900 dark:text-white">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${statusBadgeClass(
                    selectedOrder.status
                  )}`}
                >
                  {statusLabel(selectedOrder.status)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Total</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatPrice(selectedOrder.totalAmount)}
                </span>
              </div>
              {selectedOrder.locality || selectedOrder.county || selectedOrder.country ? (
                <div className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Address</span>
                  <p className="text-slate-900 dark:text-white mt-1">
                    {[selectedOrder.locality, selectedOrder.county, selectedOrder.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Items</p>
                <ul className="space-y-2">
                  {selectedOrder.items?.map((it, i) => (
                    <li
                      key={i}
                      className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <span className="text-slate-900 dark:text-white">
                        {it.name} × {it.quantity}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatPrice((it.price ?? 0) * (it.quantity ?? 1))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 font-medium hover:underline"
              >
                Continue shopping
                <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
