"use client";

import { useState, useEffect } from "react";
import { orderApi, ApiClientError } from "@/lib/api";
import { adaptOrder } from "../utils/typeAdapter";
import type { ApiOrder, OrderStatusFilter } from "../types";

interface UseOrdersProps {
  uid: string | null;
  orderFilter: OrderStatusFilter;
}

export function useOrders({ uid, orderFilter }: UseOrdersProps) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    // The order history endpoint is scoped to the signed-in user by the session
    // cookie, so no userId needs to be passed. Pull a generous page so the
    // profile view shows the full history without client-side pagination.
    orderApi
      .myOrders({ pageSize: 100, sort: "newest" })
      .then((page) => {
        if (!cancelled) setOrders(page.items.map(adaptOrder));
      })
      .catch((error) => {
        if (cancelled) return;
        if (!(error instanceof ApiClientError) || error.status !== 401) {
          console.error("Failed to load orders:", error);
        }
        setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    return o.status === orderFilter;
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "shipped").length;
  const deliveredOrders = orders.filter((o) => o.status === "received").length;
  const updateOrderStatus = (orderId: string, status: string) => {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
  };

  return {
    orders,
    ordersLoading,
    filteredOrders,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    updateOrderStatus,
  };
}
