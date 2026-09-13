"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Clock3, Mail, MapPin, Package, Search, Truck } from "lucide-react";
import type { OrderDTO, OrderStatus } from "@nuru/types";
import { ApiClientError, orderApi } from "@/lib/api";
import { formatPrice } from "@/lib/formatPrice";
import { formatDate, formatDateTime } from "@/lib/formatDate";

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Order placed",
  CONFIRMED: "Order confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "In transit",
  AT_PICKUP_STATION: "Ready for pickup",
  PICKED_UP: "Collected",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const PICKUP_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "AT_PICKUP_STATION",
  "PICKED_UP",
];
const DELIVERY_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

function TrackingContent() {
  const searchParams = useSearchParams();
  const [number, setNumber] = useState(searchParams.get("order") ?? "");
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (orderNumber = number) => {
    const clean = orderNumber.trim();
    if (!clean) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      setOrder((await orderApi.track(clean)).order);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not find that order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = searchParams.get("order");
    if (initial) void load(initial);
    // The initial capability token is intentionally loaded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flow = order?.fulfillmentMethod === "PICKUP_STATION" ? PICKUP_FLOW : DELIVERY_FLOW;
  const reachedIndex = order ? flow.indexOf(order.status) : -1;
  const events = useMemo(() => order?.statusHistory ?? [], [order]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong dark:text-brand-bright">
            Live order progress
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Track your NuruShop order
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Enter the order number from your confirmation. Updates appear as your parcel moves
            through fulfillment.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
          className="mt-6 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row"
        >
          <label className="relative flex-1">
            <span className="sr-only">Order number</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="Order number"
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <button
            disabled={loading || !number.trim()}
            className="rounded-xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {loading ? "Checking…" : "Track order"}
          </button>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-4 max-w-2xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {order && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Order</p>
                  <h2 className="break-all text-xl font-black">#{order.orderNumber}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Placed {formatDate(order.createdAt)}
                  </p>
                </div>
                <span className="self-start rounded-full bg-brand-surface px-3 py-1.5 text-sm font-bold text-brand-strong">
                  {LABELS[order.status]}
                </span>
              </div>
              {order.status === "CANCELLED" || order.status === "REFUNDED" ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                  This order is {LABELS[order.status].toLowerCase()}. Contact support if you need
                  help.
                </div>
              ) : (
                <ol className="mt-6 space-y-0">
                  {flow.map((status, index) => {
                    const complete = index <= reachedIndex;
                    const event = [...events].reverse().find((item) => item.toStatus === status);
                    return (
                      <li key={status} className="relative flex gap-4 pb-7 last:pb-0">
                        {index < flow.length - 1 && (
                          <span
                            className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${index < reachedIndex ? "bg-brand" : "bg-slate-200 dark:bg-slate-700"}`}
                          />
                        )}
                        <span
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${complete ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"}`}
                        >
                          {complete ? <Check size={16} /> : <Clock3 size={15} />}
                        </span>
                        <div className="min-w-0 pt-1">
                          <p
                            className={`font-bold ${complete ? "text-slate-950 dark:text-white" : "text-slate-400"}`}
                          >
                            {LABELS[status]}
                          </p>
                          {event && (
                            <>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatDateTime(event.createdAt)}
                              </p>
                              {event.note && (
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                  {event.note}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <MapPin className="text-brand" size={20} />
                  <h2 className="font-black">
                    {order.fulfillmentMethod === "PICKUP_STATION"
                      ? "Pickup details"
                      : "Delivery details"}
                  </h2>
                </div>
                <p className="mt-3 font-bold">
                  {order.pickupStationName ||
                    (order.fulfillmentMethod === "DOORSTEP"
                      ? "Doorstep delivery"
                      : "Standard delivery")}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {order.pickupStationAddress || order.address}
                </p>
                {order.deliveryEta && (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
                    <Truck size={16} /> Estimate: {order.deliveryEta}
                  </p>
                )}
                {order.status === "AT_PICKUP_STATION" && (
                  <div className="mt-4 rounded-2xl border border-brand-border bg-brand-surface p-4">
                    <p className="font-bold text-brand-strong">Ready to collect</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Bring this order number and valid identification. Check your parcel before
                      leaving.
                    </p>
                    {order.pickupReadyEmailStatus === "SENT" && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
                        <Mail size={14} /> Pickup email sent
                      </p>
                    )}
                  </div>
                )}
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Package className="text-brand" size={20} />
                  <h2 className="font-black">Order summary</h2>
                </div>
                <ul className="mt-3 space-y-2">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {item.productName} × {item.quantity}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatPrice(Number(item.lineTotal))}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 font-black dark:border-slate-800">
                  <span>Total</span>
                  <span>{formatPrice(Number(order.total))}</span>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 py-20 text-center text-slate-500">
          Loading tracking…
        </main>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
