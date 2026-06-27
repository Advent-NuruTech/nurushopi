"use client";

import React, { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type SabbathMessage = {
  id: string;
  message: string;
  sabbathDate: string;
  createdAt?: string | null;
};

const MAX_MESSAGE_LENGTH = 5000;

const isFridayDate = (value: string) => {
  if (!value) return false;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCDay() === 5;
};

const formatDateLabel = (value: string) => {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const getUpcomingFridays = (count: number) => {
  const dates: string[] = [];
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  const firstFriday = new Date(now);
  firstFriday.setDate(now.getDate() + daysUntilFriday);

  for (let i = 0; i < count; i += 1) {
    const next = new Date(firstFriday);
    next.setDate(firstFriday.getDate() + i * 7);
    const dateString = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
      next.getDate()
    ).padStart(2, "0")}`;
    dates.push(dateString);
  }

  return dates;
};

export default function SabbathMessagesTab() {
  const [messages, setMessages] = useState<SabbathMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [newMessage, setNewMessage] = useState("");
  const [newDate, setNewDate] = useState("");

  const upcomingFridays = useMemo(() => getUpcomingFridays(16), []);

  const loadMessages = () => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/sabbath-messages", { credentials: "include" })
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          messages?: SabbathMessage[];
          error?: string;
        };
        if (!r.ok) throw new Error(payload.error || "Failed to load Sabbath messages.");
        setMessages(payload.messages ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load Sabbath messages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filterDate && m.sabbathDate !== filterDate) return false;
      if (!needle) return true;
      return (
        m.sabbathDate.toLowerCase().includes(needle) ||
        m.message.toLowerCase().includes(needle)
      );
    });
  }, [messages, search, filterDate]);

  const createMessage = async () => {
    const trimmed = newMessage.trim();
    const dateValue = newDate.trim();
    if (!trimmed) {
      setError("Message text is required.");
      return;
    }
    if (!isFridayDate(dateValue)) {
      setError("Please select a Friday for the Sabbath date.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sabbath-messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed.slice(0, MAX_MESSAGE_LENGTH),
          sabbathDate: dateValue,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to create message.");
      setNewMessage("");
      setNewDate("");
      loadMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create message.");
    } finally {
      setCreating(false);
    }
  };

  const saveMessage = async (message: SabbathMessage) => {
    const trimmed = message.message.trim();
    if (!trimmed) {
      setError("Message text is required.");
      return;
    }
    if (!isFridayDate(message.sabbathDate)) {
      setError("Sabbath date must be a Friday.");
      return;
    }

    setSavingId(message.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/sabbath-messages", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: message.id,
          message: trimmed.slice(0, MAX_MESSAGE_LENGTH),
          sabbathDate: message.sabbathDate,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to save message.");
      setMessages((prev) => prev.map((item) => (item.id === message.id ? message : item)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save message.");
    } finally {
      setSavingId(null);
    }
  };

  const removeMessage = async (id: string) => {
    if (!confirm("Delete this Sabbath message?")) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sabbath-messages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to delete message.");
      setMessages((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete message.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Sabbath messages..." />;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sabbath Messages</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Schedule a Sabbath message for each Friday sunset. Messages show during Sabbath hours only.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Total messages: {messages.length} | Showing: {filtered.length}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Add New Message</h3>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Message Text
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={4}
              placeholder="Write the Sabbath message..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sabbath Date (Friday)
            </label>
            <select
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">Select upcoming Friday</option>
              {upcomingFridays.map((date) => (
                <option key={date} value={date}>
                  {formatDateLabel(date)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Only Fridays are accepted.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={createMessage}
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-60"
        >
          {creating ? "Saving..." : "Schedule Message"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Message History</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by date or text..."
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {filtered.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatDateLabel(item.sabbathDate)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Created: {formatTimestamp(item.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveMessage(item)}
                  disabled={savingId === item.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-60"
                >
                  {savingId === item.id ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => removeMessage(item.id)}
                  disabled={savingId === item.id}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Sabbath Date
                </label>
                <input
                  type="date"
                  value={item.sabbathDate}
                  onChange={(e) =>
                    setMessages((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, sabbathDate: e.target.value } : x
                      )
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={item.message}
                  onChange={(e) =>
                    setMessages((prev) =>
                      prev.map((x) =>
                        x.id === item.id ? { ...x, message: e.target.value } : x
                      )
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            No Sabbath messages yet. Add the first one above.
          </div>
        )}
      </div>
    </section>
  );
}
