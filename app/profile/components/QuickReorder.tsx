"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import type { ApiOrder, OrderItem } from "../types";

interface Props {
  orders: ApiOrder[];
}

export default function QuickReorder({ orders }: Props) {
  const { addToCart } = useCart();
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!orders.length) {
    return <p className="text-gray-500">No previous orders found.</p>;
  }

  const openOrder = (order: ApiOrder) => {
    setSelectedOrder(order);
    // Initialize quantities
    const q: Record<string, number> = {};
    order.items?.forEach((item) => {
      q[item.id] = item.quantity;
    });
    setQuantities(q);
  };

  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: value }));
  };

  const addSelectedToCart = () => {
    if (!selectedOrder?.items) return;

    selectedOrder.items.forEach((item) => {
      const qty = quantities[item.id] ?? item.quantity;
      if (qty > 0) {
        addToCart({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image ?? "/assets/default-product.jpg",
          quantity: qty,
        });
      }
    });

    setSelectedOrder(null); // close modal
  };

  return (
    <div className="space-y-4">
      {orders.slice(0, 5).map((order) => (
        <div
          key={order.id}
          className="border p-4 rounded-lg flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
            <p className="text-sm text-gray-500">
              Total: KSh {order.totalAmount ?? 0}
            </p>
            <div className="flex gap-2 mt-2">
              {order.items?.slice(0, 3).map((item) => (
                <Image
                  key={item.id}
                  src={item.image ?? "/assets/default-product.jpg"}
                  alt={item.name}
                  width={40}
                  height={40}
                  className="rounded"
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => openOrder(order)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Reorder
          </button>
        </div>
      ))}

      {/* Modal for order details */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12 max-w-2xl relative">
            <h2 className="text-xl font-bold mb-4">
              Reorder #{selectedOrder.id.slice(0, 8)}
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedOrder.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={item.image ?? "/assets/default-product.jpg"}
                      alt={item.name}
                      width={50}
                      height={50}
                      className="rounded"
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        KSh {item.price}
                      </p>
                    </div>
                  </div>

                  <input
                    type="number"
                    min={0}
                    value={quantities[item.id]}
                    onChange={(e) =>
                      handleQuantityChange(item.id, Number(e.target.value))
                    }
                    className="w-16 border rounded px-2 py-1 text-center"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6 gap-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={addSelectedToCart}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                Add to Cart & Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
