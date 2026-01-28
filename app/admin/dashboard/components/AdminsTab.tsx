"use client";

import React, { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Admin } from "./types";

export default function AdminsTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/admins", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAdmins(d.admins ?? []))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (adminId: string) => {
    if (!confirm("Remove this admin? They will no longer be able to sign in.")) return;
    const res = await fetch(`/api/admin/admins?adminId=${adminId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) setAdmins((prev) => prev.filter((a) => a.adminId !== adminId));
  };

  if (loading) return <LoadingSpinner text="Loading admins…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Admin Management</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">{admins.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-sm text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.adminId} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{a.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    a.role === "senior" 
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" 
                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {a.role === "senior" ? "Super Admin" : "Sub Admin"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.role === "sub" && (
                    <button
                      onClick={() => remove(a.adminId)}
                      className="text-red-600 dark:text-red-400 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}