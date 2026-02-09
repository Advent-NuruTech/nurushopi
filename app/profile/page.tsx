"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/context/UserContext";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AnimatePresence } from "framer-motion";
import {
  UserCircle,
  Package,
  Settings,
  Gift,
  MessageSquare,
  Bell,
  Store,
  ShoppingBag,
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
//import QuickReorder from "./components/QuickReorder";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import { useProfileData } from "./hooks/useProfileData";
import { useOrders } from "./hooks/useOrders";
import type { ApiOrder, OrderStatusFilter } from "./types";
import { adaptAppUser } from "./utils/typeAdapter";

export default function ProfilePage() {
  const router = useRouter();
  const { user: contextUser, isLoading: userLoading } = useAppUser();

  /* ------------------- Hooks ------------------- */
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [greeting, setGreeting] = useState("");

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
    filteredOrders,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    ordersLoading,
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

  /* ------------------- Display ------------------- */
  const displayName =
    profile?.fullName || appUser?.name || firebaseUser?.displayName || "User";
  const firstName = displayName.split(" ")[0];
  const email = appUser?.email || firebaseUser?.email || "";
  const avatarUrl =
    appUser?.imageUrl || firebaseUser?.photoURL || "/assets/logo.jpg";

  /* ------------------- Notifications ------------------- */
  const notificationCount = unreadMessages + pendingOrders;

  /* ------------------- Tabs ------------------- */
  const tabs = useMemo(
    () => [
      { id: "overview", label: "Home", icon: UserCircle },
      { id: "orders", label: "Orders", icon: Package },
      { id: "messages", label: "Messages", icon: MessageSquare },
      //{ id: "reorder", label: "Quick Reorder", icon: ShoppingBag },
      { id: "profile", label: "Profile", icon: Settings },
      { id: "invite", label: "Invite", icon: Gift },
      { id: "shop", label: "Shop", icon: Store },
    ],
    []
  );

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

        <button
          onClick={() =>
            setActiveTab(unreadMessages > 0 ? "messages" : "orders")
          }
          className="relative"
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
  );

  /* ------------------- Bottom Navigation ------------------- */
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex justify-around h-16">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "shop") router.push("/");
              else setActiveTab(t.id);
            }}
            className={`flex flex-col items-center justify-center flex-1 ${
              activeTab === t.id ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />

              {t.id === "messages" && unreadMessages > 0 && (
                <span className="absolute -top-2 -right-2 text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}

              {t.id === "orders" && pendingOrders > 0 && (
                <span className="absolute -top-2 -right-2 text-[10px] bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingOrders > 9 ? "9+" : pendingOrders}
                </span>
              )}
            </div>

            <span className="text-xs">{t.label}</span>
          </button>
        );
      })}
    </div>
  );

  /* ------------------- Page Render ------------------- */
  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <AnimatePresence>
          {message && (
            <MessageToast
              message={message}
              onDismiss={() => setMessage(null)}
            />
          )}
        </AnimatePresence>

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

        {activeTab === "messages" && uid && (
          <MessagesPanel
            userId={uid}
            displayName={displayName}
            onUnreadChange={setUnreadMessages}
          />
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

      <BottomNav />

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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
