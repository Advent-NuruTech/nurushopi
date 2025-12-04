'use client';

import React, { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { formatPrice } from '@/lib/formatPrice';
import DownloadReceiptButton from '@/components/ui/DownloadReceiptButton'; // Adjust import path as needed

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type Order = {
  id: string;
  userId?: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  name: string;
  phone: string;
  email?: string;
  country: string;
  county: string;
  locality: string;
  message?: string;
  items: OrderItem[];
};

type ContactMessage = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  message: string;
  createdAt: string;
};

export default function ReceivedPageClient() {
  const { isSignedIn, user } = useUser();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [orRes, msgRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/contact'),
        ]);

        const orJson = orRes.ok ? await orRes.json() : { orders: [] };
        const msgJson = msgRes.ok ? await msgRes.json() : { messages: [] };

        const sortedOrders = (orJson.orders || []).sort(
          (a: Order, b: Order) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setOrders(sortedOrders);
        setMessages(msgJson.messages || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isSignedIn]);

  const overallTotal =
    orders?.reduce((acc, order) => acc + Number(order.totalAmount), 0) || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Received — Orders & Messages</h1>

      <SignedOut>
        <div className="p-6 border rounded">
          <p className="mb-4">Sign in to view received orders and messages.</p>
          <SignInButton>
            <button className="px-4 py-2 bg-sky-600 text-white rounded">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ORDERS SECTION */}
          <section className="p-4 border rounded">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-xl">Orders</h2>
              {!loading && orders && (
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Overall Total
                  </p>
                  <p className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {formatPrice(overallTotal)}
                  </p>
                </div>
              )}
            </div>

            {loading && <div className="text-slate-500">Loading...</div>}
            {!loading && !orders?.length && (
              <div className="text-slate-500">No orders yet.</div>
            )}
            {!loading && orders?.length && (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 border rounded-lg shadow-sm bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-100">
                          Order #{o.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          {formatPrice(Number(o.totalAmount))}
                        </div>
                     
                      </div>
                    </div>

                    <div className="mt-4 border-t pt-4 dark:border-slate-700">
                      <h3 className="font-semibold text-md mb-2 text-slate-700 dark:text-slate-200">
                        Customer Details
                      </h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <p>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Name:
                          </span>{' '}
                          {o.name}
                        </p>
                        <p>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Phone:
                          </span>{' '}
                          {o.phone}
                        </p>
                         <p>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Country:
                          </span>{' '}
                          {o.country}
                        </p>
                        <p>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            County:
                          </span>{' '}
                          {o.county}
                        </p>
                        <p>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Locality:
                          </span>{' '}
                          {o.locality}
                        </p>
                        {o.email && (
                          <p className="col-span-2">
                            <span className="font-medium text-slate-600 dark:text-slate-400">
                              Email:
                            </span>{' '}
                            {o.email}
                          </p>
                        )}
                        {o.message && (
                          <p className="col-span-2 mt-1 italic text-slate-500 dark:text-slate-400">
                            "{o.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t pt-4 dark:border-slate-700">
                      <h3 className="font-semibold text-md mb-2 text-slate-700 dark:text-slate-200">
                        Order Items
                      </h3>
                      <div className="space-y-2">
                        {o.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-white dark:bg-slate-700 rounded-md"
                          >
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="rounded object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {item.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 text-right">
                      <DownloadReceiptButton order={o} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CONTACT MESSAGES SECTION */}
          <section className="p-4 border rounded">
            <h2 className="font-semibold mb-3">Contact Messages</h2>
            {!loading && !messages?.length && (
              <div className="text-slate-500">No messages yet.</div>
            )}
            {!loading && messages?.length && (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="p-3 border rounded">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-slate-500">
                      {m.email ?? m.phone}
                    </div>
                    <div className="mt-2 text-sm">{m.message}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 text-sm text-slate-500">
          <p>
            Security reminder: Protect `/api/orders` and `/api/contact` on
            server-side. Verify Clerk sessions and admin roles before returning
            sensitive data.
          </p>
        </div>
      </SignedIn>
    </div>
  );
}