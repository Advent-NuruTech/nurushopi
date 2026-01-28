"use client";

import React, { useState } from "react";
import { UserPlus, Copy, Loader2 } from "lucide-react";

export default function InviteTab() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setLink("");
    try {
      const res = await fetch("/api/admin/auth/invite", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setLink(data.link ?? "");
        // Show congratulations message
        alert("Congratulations! Invite link generated successfully. Share this link with the new admin.");
      }
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
        Generate a link to invite a new Sub Admin. They will use this link to sign up.
        <br />
        <span className="font-medium text-sky-600">Congratulations! Link works on both mobile and desktop.</span>
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
          Generate invite link
        </button>
        {link && (
          <div className="flex-1 min-w-0 flex gap-2">
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
      </div>
    </section>
  );
}