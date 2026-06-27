"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

type OrderItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt?: string | number | Date;
};

export default function OrderList({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editJson, setEditJson] = useState("");

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?userId=${userId}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(orderId: string) {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/orders?orderId=${orderId}&userId=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete order");
    }
  }

  function openEditor(order: Order) {
    setEditingOrder(order);
    setEditJson(
      JSON.stringify(
        { items: order.items, total: order.total, status: order.status },
        null,
        2
      )
    );
  }

  async function saveEdit() {
    if (!editingOrder) return;
    try {
      const updates = JSON.parse(editJson);
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: editingOrder.id,
          updates,
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        setEditingOrder(null);
      } else {
        alert(data.error || "Failed to update");
      }
    } catch (err) {
      console.error(err);
      alert("Invalid JSON or server error");
    }
  }

  if (loading) return <p>Loading orders...</p>;
  if (orders.length === 0) return <p>No orders yet.</p>;

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="border rounded p-4 bg-white dark:bg-slate-800 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">Order #{order.id}</p>
              <p className="text-sm text-gray-500">Status: {order.status}</p>
              <p className="text-sm text-gray-500">
                Total: KSh {Number(order.total).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEditor(order)}
                className="px-3 py-1 border rounded"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(order.id)}
                className="px-3 py-1 border rounded text-red-600"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {order.items?.map((it, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="relative w-16 h-16">
                  <Image
                    src={it.image || "/assets/logo.jpg"}
                    alt={it.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">{it.name}</p>
                  <p className="text-sm text-gray-500">
                    Qty: {it.quantity} • KSh {Number(it.price).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold mb-3">
              Edit Order {editingOrder.id}
            </h3>
            <textarea
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              className="w-full h-56 p-2 border rounded bg-white dark:bg-slate-800"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
