"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/context/UserContext";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCircle, 
  Package, 
  Settings, 
  Gift,
  ChevronRight,
  CheckCircle,
  Clock,
  Home,
  MessageSquare
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
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useProfileData } from "./hooks/useProfileData";
import { useOrders } from "./hooks/useOrders";
import type { ApiOrder, UserProfile, OrderStatusFilter } from "./types";
import { adaptAppUser } from "./utils/typeAdapter";

export default function ProfilePage() {
  const router = useRouter();
  const { user: contextUser, isLoading: userLoading } = useAppUser();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [greeting, setGreeting] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Adapt the context user to match our local type
  const appUser = adaptAppUser(contextUser);
  
  const uid = firebaseUser?.uid ?? appUser?.id ?? null;

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setFirebaseUser);
    return unsub;
  }, []);

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

  const {
    orders,
    ordersLoading,
    filteredOrders,
    totalOrders,
    pendingOrders,
    deliveredOrders,
  } = useOrders({ uid, orderFilter });

  useEffect(() => {
    if (!uid) return;
    fetch(`/api/messages?userId=${uid}`)
      .then((r) => r.json())
      .then((d) => {
        const msgs = d.messages ?? [];
        const count = msgs.filter(
          (m: { recipientId?: string; readAt?: unknown }) =>
            m.recipientId === uid && !m.readAt
        ).length;
        setUnreadMessages(count);
      })
      .catch(() => setUnreadMessages(0));
  }, [uid]);

  // Load profile when uid changes
  useEffect(() => {
    if (uid) {
      loadProfile();
    }
  }, [uid, loadProfile]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
        <LoadingSpinner size={56} text="Loading your profile..." />
      </div>
    );
  }

  if (!contextUser && !firebaseUser) {
    return <AuthRequired />;
  }

  const displayName = profile?.fullName || appUser?.name || firebaseUser?.displayName || "User";
  const firstName = displayName.split(' ')[0];
  const email = appUser?.email || firebaseUser?.email || "";
  const avatarUrl = appUser?.imageUrl || firebaseUser?.photoURL || "/assets/logo.jpg";

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: Package, color: "blue" },
    { label: "Pending", value: pendingOrders, icon: Clock, color: "amber" },
    { label: "Delivered", value: deliveredOrders, icon: CheckCircle, color: "emerald" },
 ];

  const tabs = [
    { id: "overview", label: "Overview", icon: UserCircle },
    { id: "orders", label: "My Orders", icon: Package },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "profile", label: "Edit Profile", icon: Settings },
    { id: "invite", label: "Invite Friends", icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
       <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className=" sm:inline">Back to Home</span>
            </button>
      {/* Personalized Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 text-white py-12"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left">
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                {greeting}, <span className="text-yellow-300">{firstName}</span>! 👋
              </h1>
              <p className="text-blue-100 text-lg opacity-90">
                   Manage your account, orders, and invite others to NuruShop.
        
              </p>
            </div>
            
            {/* User Avatar with Animation */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="mt-6 md:mt-0 relative"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden bg-gradient-to-br from-white/20 to-transparent backdrop-blur-sm">
                  <img 
                    src={avatarUrl} 
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&bold=true&size=96`;
                    }}
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">





        
       
        {/* Navigation Tabs */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-8 overflow-hidden"
        >
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 px-6 py-4 flex items-center justify-center gap-3 font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.id === "orders" && pendingOrders > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                    {pendingOrders}
                  </span>
                )}
                {tab.id === "messages" && unreadMessages > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadMessages}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Toast message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <MessageToast message={message} onDismiss={() => setMessage(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {activeTab === "overview" && (
            <>
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
              
              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveTab("orders")}
                    className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Package className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Track Orders</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Check your order status
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("profile")}
                    className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Update Profile</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Edit your information
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("invite")}
                    className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Gift className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Invite & Earn</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Share with friends
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                </div>
              </div>
            </>
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
        </motion.div>
      </div>

      {/* Confirm save modal */}
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

      {/* Order details modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </AnimatePresence>


      {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg hover:shadow-xl transition-all cursor-default border border-${stat.color}-100 dark:border-${stat.color}-900/30`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

       
    </div>
  );
}
