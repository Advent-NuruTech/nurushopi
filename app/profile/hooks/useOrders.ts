"use client";

import { useState, useEffect } from "react";
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
      setOrdersLoading(false);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    fetch(`/api/orders?userId=${uid}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrders(data.orders ?? []);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load orders:", error);
          setOrders([]);
        }
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
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const deliveredOrders = orders.filter((o) => o.status === "received").length;

  return {
    orders,
    ordersLoading,
    filteredOrders,
    totalOrders,
    pendingOrders,
    deliveredOrders,
  };
}