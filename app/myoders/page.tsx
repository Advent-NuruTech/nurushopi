"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/ui/Navbar";

import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppUser } from "@/context/UserContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ManageOrders from "../profile/components/ManageOrders";
import AuthRequired from "../profile/components/AuthRequired";
import OrderDetailsModal from "../profile/components/OrderDetailsModal";
import { useOrders } from "../profile/hooks/useOrders";
import type { ApiOrder, OrderStatusFilter } from "../profile/types";

export default function MyOrdersPage() {
  const { user: contextUser, isLoading } = useAppUser();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsub();
  }, []);

  const uid = firebaseUser?.uid ?? contextUser?.id ?? null;
  const { filteredOrders, ordersLoading } = useOrders({ uid, orderFilter });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
        <LoadingSpinner size={56} text="Loading your orders..." />
      </div>
    );
  }

  if (!contextUser && !firebaseUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 px-4 py-12">
        <AuthRequired />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <ManageOrders
          orders={filteredOrders}
          ordersLoading={ordersLoading}
          orderFilter={orderFilter}
          onFilterChange={setOrderFilter}
          onViewDetails={setSelectedOrder}
        />
      </div>
 <Navbar />
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
