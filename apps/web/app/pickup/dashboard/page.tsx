"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import type { OrderDTO, OrderStatus, PickupAgentDTO } from "@nuru/types";
import { ApiClientError, pickupAgentApi } from "@/lib/api";
import { formatPrice } from "@/lib/formatPrice";
import { PICKUP_AGENT_TERMS_PATH, PICKUP_LOGIN_PATH } from "@/lib/pickupPaths";

const FILTERS: Array<{ value: "ALL" | OrderStatus; label: string }> = [
  { value: "ALL", label: "Active" },
  { value: "SHIPPED", label: "Inbound" },
  { value: "AT_PICKUP_STATION", label: "Ready" },
  { value: "PICKED_UP", label: "Collected" },
];

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Pending confirmation",
  CONFIRMED: "Confirmed",
  PROCESSING: "Preparing",
  SHIPPED: "On the way to station",
  AT_PICKUP_STATION: "Ready for pickup",
  PICKED_UP: "Collected",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function PickupDashboardPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<PickupAgentDTO | null>(null);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ agent: current }, page] = await Promise.all([
        pickupAgentApi.me(),
        pickupAgentApi.orders({ pageSize: 100, search: search.trim() || undefined }),
      ]);
      setAgent(current);
      setOrders(page.items);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.replace(PICKUP_LOGIN_PATH);
      } else
        setError(
          caught instanceof ApiClientError ? caught.message : "Could not load station orders.",
        );
    } finally {
      setLoading(false);
    }
  }, [router, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (filter === "ALL")
          return !["PICKED_UP", "DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status);
        return order.status === filter;
      }),
    [filter, orders],
  );

  const updateStatus = async (order: OrderDTO, status: "AT_PICKUP_STATION" | "PICKED_UP") => {
    if (
      status === "PICKED_UP" &&
      !window.confirm(
        `Confirm that ${order.contactName || "the customer"} has received the parcel?`,
      )
    ) {
      return;
    }
    setWorking(order.id);
    setError("");
    try {
      const { order: updated } = await pickupAgentApi.updateOrderStatus(order.id, {
        status,
        note: notes[order.id]?.trim() || null,
      });
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotes((current) => ({ ...current, [order.id]: "" }));
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not update the order.");
    } finally {
      setWorking(null);
    }
  };

  const logout = async () => {
    await pickupAgentApi.logout().catch(() => undefined);
    router.replace(PICKUP_LOGIN_PATH);
    router.refresh();
  };

  const counts = {
    inbound: orders.filter((order) => ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status))
      .length,
    ready: orders.filter((order) => order.status === "AT_PICKUP_STATION").length,
    collected: orders.filter((order) => order.status === "PICKED_UP").length,
    emailIssues: orders.filter((order) => order.pickupReadyEmailStatus === "FAILED").length,
  };

  return (
    <main className="min-h-screen bg-slate-100/70 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-strong dark:text-brand-bright">
              Pickup operations
            </p>
            <h1 className="truncate text-lg font-black">
              {agent?.stationName ?? "Station dashboard"}
            </h1>
            <p className="truncate text-xs text-slate-500">{agent?.stationAddress}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={PICKUP_AGENT_TERMS_PATH}
              target="_blank"
              className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-brand-strong hover:bg-brand-surface sm:inline-flex dark:text-brand-bright dark:hover:bg-brand-ink/30"
            >
              Station terms
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {[
            { label: "Inbound", value: counts.inbound, Icon: Truck },
            { label: "Ready", value: counts.ready, Icon: Clock3 },
            { label: "Collected", value: counts.collected, Icon: PackageCheck },
            { label: "Email issues", value: counts.emailIssues, Icon: Mail },
          ].map(({ label, value, Icon }) => (
            <div
              key={label}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <Icon className="text-brand" size={20} />
              <p className="mt-3 break-words text-lg font-black md:text-2xl">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${filter === item.value ? "bg-brand text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void load();
              }}
              className="relative w-full lg:max-w-sm"
            >
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order, customer, or phone"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950"
              />
            </form>
          </div>
        </section>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-12 text-center text-slate-500">Loading station orders…</p>
        ) : visibleOrders.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No orders in this queue.
          </p>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {visibleOrders.map((order) => (
              <article
                key={order.id}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-black">#{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.contactName} · {order.contactPhone}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand-strong">
                    {statusLabel[order.status]}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Items</p>
                    <p className="font-bold">{order.itemCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="font-bold">{formatPrice(Number(order.total))}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{item.productName}</span>
                      <span className="shrink-0 font-semibold">×{item.quantity}</span>
                    </li>
                  ))}
                </ul>
                {(order.status === "CONFIRMED" ||
                  order.status === "PROCESSING" ||
                  order.status === "SHIPPED" ||
                  order.status === "AT_PICKUP_STATION") && (
                  <textarea
                    value={notes[order.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [order.id]: event.target.value }))
                    }
                    maxLength={500}
                    rows={2}
                    placeholder="Optional handover note"
                    className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950"
                  />
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status) && (
                    <button
                      disabled={working === order.id}
                      onClick={() => void updateStatus(order, "AT_PICKUP_STATION")}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
                    >
                      <MapPin size={16} /> Confirm arrived & notify
                    </button>
                  )}
                  {order.status === "AT_PICKUP_STATION" && (
                    <button
                      disabled={working === order.id}
                      onClick={() => void updateStatus(order, "PICKED_UP")}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} /> Confirm customer collected
                    </button>
                  )}
                  {order.status === "AT_PICKUP_STATION" &&
                    order.pickupReadyEmailStatus === "FAILED" && (
                      <button
                        onClick={() =>
                          void pickupAgentApi.retryPickupReadyEmail(order.id).then(load)
                        }
                        className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-bold text-amber-800"
                      >
                        Retry email
                      </button>
                    )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
