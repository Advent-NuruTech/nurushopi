"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { usersApi, ApiClientError } from "@/lib/api";
import type { AdminUserSummaryDTO } from "@nuru/types";

export default function UsersTab({ role }: { role: "senior" | "sub" }) {
  const [users, setUsers] = useState<AdminUserSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    usersApi.admin
      .list()
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.phone].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [query, users]);

  if (loading) return <LoadingSpinner text="Loading users..." />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Users ({users.length})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View customers, orders, and wallet balances.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone"
          className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Orders</th>
              <th className="px-4 py-3 text-left">Total Spend</th>
              <th className="px-4 py-3 text-left">Wallet</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">{u.totalOrders}</td>
                <td className="px-4 py-3">{formatPrice(Number(u.totalSpend))}</td>
                <td className="px-4 py-3">{formatPrice(Number(u.walletBalance))}</td>
                <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={adminRoute(`${ADMIN_DASHBOARD_PATH}/users/${u.id}`)}
                      className="text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      View
                    </Link>
                    {role === "senior" && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete ${u.name ?? u.email}? This cannot be undone.`)) return;
                          try {
                            await usersApi.admin.remove(u.id);
                            setUsers((prev) => prev.filter((x) => x.id !== u.id));
                          } catch (err) {
                            if (err instanceof ApiClientError) alert(err.message);
                          }
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No users found.</p>
      )}
    </section>
  );
}
