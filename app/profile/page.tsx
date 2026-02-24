"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppUser } from "@/context/UserContext";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserCircle,
  Package,
  Settings,
  Gift,
  MessageSquare,
  Bell,
  Store,
  ShoppingBag,
  Star,
  Menu,
  X,
} from "lucide-react";

import ProfileOverview from "./components/ProfileOverview";
import ManageOrders from "./components/ManageOrders";
import UpdateProfile from "./components/UpdateProfile";
import InviteSection from "./components/InviteSection";
import MessageToast from "./components/MessageToast";
import OrderDetailsModal from "./components/OrderDetailsModal";
import ConfirmSaveModal from "./components/ConfirmSaveModal";
import AuthRequired from "./components/AuthRequired";
import MessagesPanel from "./components/MessagesPanel";
import WalletTab from "./components/WalletTab";
import ReviewsTab from "./components/ReviewsTab";
//import QuickReorder from "./components/QuickReorder";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import { useProfileData } from "./hooks/useProfileData";
import { useOrders } from "./hooks/useOrders";
import type { ApiOrder, OrderStatusFilter } from "./types";
import { adaptAppUser } from "./utils/typeAdapter";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: contextUser, isLoading: userLoading } = useAppUser();

  /* ------------------- Hooks ------------------- */
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadReviewPrompts, setUnreadReviewPrompts] = useState(0);
  const [greeting, setGreeting] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const appUser = adaptAppUser(contextUser);
  const uid = firebaseUser?.uid ?? appUser?.id ?? null;

  /* ------------------- Greeting ------------------- */
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  /* ------------------- Auth ------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setFirebaseUser);
    return unsub;
  }, []);

  /* ------------------- Profile ------------------- */
  const {
    profile,
    profileLoading,
    editFullName,
    setEditFullName,
    editPhone,
    setEditPhone,
    editAddress,
    setEditAddress,
    inviteCount,
    message,
    setMessage,
    saving,
    loadProfile,
    handleSaveProfile,
  } = useProfileData({ uid, appUser, firebaseUser });

  /* ------------------- Orders ------------------- */
  const {
    orders,
    filteredOrders,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    ordersLoading,
    updateOrderStatus,
  } = useOrders({ uid, orderFilter });

  /* ------------------- Messages ------------------- */
  useEffect(() => {
    if (!uid) return;
    fetch(`/api/messages?userId=${uid}`)
      .then((r) => r.json())
      .then((d) => {
        const msgs = d.messages ?? [];
        const unread = msgs.filter(
          (m: { recipientId?: string; readAt?: unknown }) =>
            m.recipientId === uid && !m.readAt
        ).length;
        setUnreadMessages(unread);
      })
      .catch(() => setUnreadMessages(0));
  }, [uid]);

  /* ------------------- Load Profile ------------------- */
  useEffect(() => {
    if (uid) loadProfile();
  }, [uid, loadProfile]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    if (tab === "shop") {
      router.push("/");
      return;
    }
    if (
      ["overview", "orders", "messages", "reviews", "wallet", "profile", "invite"].includes(tab)
    ) {
      setActiveTab(tab);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (!uid) {
      setUnreadReviewPrompts(0);
      return;
    }
    let cancelled = false;
    fetch(`/api/user-notifications?userId=${uid}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list = Array.isArray(d.notifications) ? d.notifications : [];
        const count = list.filter((n: { type?: string; readAt?: unknown }) => n.type === "review_prompt" && !n.readAt).length;
        setUnreadReviewPrompts(count);
      })
      .catch(() => {
        if (!cancelled) setUnreadReviewPrompts(0);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, activeTab]);

  /* ------------------- Display ------------------- */
  const displayName =
    profile?.fullName || appUser?.name || firebaseUser?.displayName || "User";
  const firstName = displayName.split(" ")[0];
  const email = appUser?.email || firebaseUser?.email || "";
  const avatarUrl =
    appUser?.imageUrl || firebaseUser?.photoURL || "/assets/logo.jpg";

  /* ------------------- Notifications ------------------- */
  const notificationCount = unreadMessages + pendingOrders + unreadReviewPrompts;

  /* ------------------- Tabs ------------------- */
  const tabs = useMemo(
    () => [
      { id: "overview", label: "Home", icon: UserCircle },
      { id: "orders", label: "Orders", icon: Package },
      { id: "messages", label: "Messages", icon: MessageSquare },
      { id: "reviews", label: "Reviews", icon: Star },
      //{ id: "reorder", label: "Quick Reorder", icon: ShoppingBag },
      { id: "wallet", label: "Wallet", icon: ShoppingBag },
      { id: "profile", label: "Profile", icon: Settings },
      { id: "invite", label: "Invite", icon: Gift },
      { id: "shop", label: "Shop", icon: Store },
    ],
    []
  );

  const handleTabChange = (tabId: string) => {
    setMobileSidebarOpen(false);
    if (tabId === "shop") {
      router.push("/");
      return;
    }
    setActiveTab(tabId);
  };

  /* ------------------- Early Loading ------------------- */
  if (userLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={56} text="Loading profile..." />
      </div>
    );

  if (!contextUser && !firebaseUser) return <AuthRequired />;

  /* ------------------- Header ------------------- */
  const Header = () => (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
      <div className="px-4 md:px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm opacity-90">Manage your account</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Open profile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() =>
              setActiveTab(unreadMessages > 0 ? "messages" : "orders")
            }
            className="relative"
            type="button"
          >
            <Bell className="w-6 h-6" />
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 w-5 h-5 text-xs flex items-center justify-center rounded-full">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  /* ------------------- Desktop Sidebar ------------------- */
  const DesktopSidebar = () => (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-3">
        <nav className="space-y-1 max-h-[70vh] overflow-y-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            const badgeCount =
              t.id === "messages"
                ? unreadMessages
                : t.id === "orders"
                ? pendingOrders
                : t.id === "reviews"
                ? unreadReviewPrompts
                : 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {t.label}
                </span>
                {badgeCount > 0 && (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] inline-flex items-center justify-center">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );

  /* ------------------- Mobile Sidebar ------------------- */
  const MobileSidebar = () => (
    <AnimatePresence>
      {mobileSidebarOpen && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 bg-black/45 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close profile menu backdrop"
          />
          <motion.aside
            className="fixed inset-y-0 left-0 w-[86vw] max-w-sm bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 md:hidden flex flex-col"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            aria-label="Profile menu"
          >
            <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p className="font-semibold text-slate-900 dark:text-white">Profile Menu</p>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close profile menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1 overflow-y-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                const badgeCount =
                  t.id === "messages"
                    ? unreadMessages
                    : t.id === "orders"
                    ? pendingOrders
                    : t.id === "reviews"
                    ? unreadReviewPrompts
                    : 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTabChange(t.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl text-sm transition-colors ${
                      isActive
                        ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </span>
                    {badgeCount > 0 && (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] inline-flex items-center justify-center">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  /* ------------------- Page Render ------------------- */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <MobileSidebar />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <AnimatePresence>
          {message && (
            <MessageToast
              message={message}
              onDismiss={() => setMessage(null)}
            />
          )}
        </AnimatePresence>

        <div className="flex items-start gap-6">
          <DesktopSidebar />

          <div className="flex-1 space-y-6">
            {activeTab === "overview" && (
              <ProfileOverview
                profile={profile}
                profileLoading={profileLoading}
                displayName={displayName}
                email={email}
                avatarUrl={avatarUrl}
                totalOrders={totalOrders}
                pendingOrders={pendingOrders}
                deliveredOrders={deliveredOrders}
              />
            )}

            {activeTab === "orders" && (
              <ManageOrders
                orders={filteredOrders}
                ordersLoading={ordersLoading}
                orderFilter={orderFilter}
                onFilterChange={setOrderFilter}
                onViewDetails={setSelectedOrder}
              />
            )}

            {activeTab === "reviews" && uid && (
              <ReviewsTab
                orders={orders}
                userId={uid}
                userName={displayName}
                highlightOrderId={searchParams.get("orderId")}
              />
            )}

            {activeTab === "messages" && uid && (
              <MessagesPanel
                userId={uid}
                displayName={displayName}
                onUnreadChange={setUnreadMessages}
                onClose={() => setActiveTab("overview")}
              />
            )}

            {activeTab === "wallet" && uid && (
              <WalletTab userId={uid} />
            )}

     {/*
{activeTab === "reorder" && (
  <QuickReorder orders={filteredOrders} />
)}
*/}


            {activeTab === "profile" && (
              <UpdateProfile
                editFullName={editFullName}
                editPhone={editPhone}
                editAddress={editAddress}
                onFullNameChange={setEditFullName}
                onPhoneChange={setEditPhone}
                onAddressChange={setEditAddress}
                onSave={() => setShowConfirmModal(true)}
                saving={saving}
              />
            )}

            {activeTab === "invite" && (
              <InviteSection
                uid={uid}
                inviteCount={inviteCount}
                onError={setMessage}
              />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmSaveModal
            onClose={() => setShowConfirmModal(false)}
            onConfirm={() => {
              setShowConfirmModal(false);
              handleSaveProfile();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            userId={uid}
            userName={displayName}
            onOrderUpdated={(orderId, status) => {
              updateOrderStatus(orderId, status);
              setSelectedOrder((prev) =>
                prev && prev.id === orderId ? { ...prev, status } : prev
              );
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={56} text="Loading profile..." />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
