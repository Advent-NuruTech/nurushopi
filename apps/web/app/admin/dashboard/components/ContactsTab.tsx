"use client";

import React, { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Contact {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/contacts", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleRead = async (id: string, read: boolean) => {
    const res = await fetch("/api/admin/contacts", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    });
    if (res.ok) setContacts((c) => c.map((x) => (x.id === id ? { ...x, read } : x)));
  };

  if (loading) return <LoadingSpinner text="Loading contacts…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact messages</h2>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {contacts.map((c) => (
          <div key={c.id} className={`p-4 ${!c.read ? "bg-sky-50/50 dark:bg-sky-900/10" : ""}`}>
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{c.email}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.message}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => toggleRead(c.id, !c.read)}
                className="text-sm text-sky-600 dark:text-sky-400 hover:underline shrink-0"
              >
                {c.read ? "Mark unread" : "Mark read"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {contacts.length === 0 && (
        <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No messages.</p>
      )}
    </section>
  );
}