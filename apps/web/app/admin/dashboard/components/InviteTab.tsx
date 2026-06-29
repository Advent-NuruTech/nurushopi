"use client";

import React, { useState } from "react";
import { UserPlus, Copy, Loader2 } from "lucide-react";
import { adminAuthApi, ApiClientError } from "@/lib/api";
import { ADMIN_SIGNUP_PATH } from "@/lib/adminPaths";
import type { AdminRole } from "@nuru/types";

export default function InviteTab() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("SUB");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLink("");
    setError("");
    try {
      const { invite } = await adminAuthApi.invite({ email: email.trim().toLowerCase(), role });
      if (!invite.token) {
        setError("Invite created but no token was returned.");
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setLink(`${origin}${ADMIN_SIGNUP_PATH}?invite=${encodeURIComponent(invite.token)}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to generate invite.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Invite Admin</h2>
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
        Generate a single-use link to invite a new admin. They will use this link to sign up with
        the role you choose.
      </p>

      <form onSubmit={generate} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new.admin@nurushop.co.ke"
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="SUB">Sub Admin</option>
            <option value="SENIOR">Senior Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
          Generate invite link
        </button>
      </form>

      {link && (
        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm"
          />
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200"
          >
            <Copy size={18} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </section>
  );
}
