"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { merchandisingApi } from "@/lib/api";

export default function MarketingEmailPreference() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    merchandisingApi.preferences
      .list()
      .then(({ preferences }) => {
        if (!active) return;
        setEnabled(
          preferences.some(
            (item) =>
              item.channel === "email" && item.topic === "monthly_promotion" && item.enabled,
          ),
        );
      })
      .catch(() => {
        if (active) setMessage("We could not load your email preference.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    setMessage(null);
    try {
      const { preference } = await merchandisingApi.preferences.save({
        channel: "email",
        topic: "monthly_promotion",
        enabled: next,
        maxPerDay: 1,
        maxPerWeek: 1,
        quietHours: null,
      });
      setEnabled(preference.enabled);
      setMessage(
        preference.enabled ? "Monthly product emails are on." : "Monthly product emails are off.",
      );
    } catch {
      setMessage("We could not save your preference. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Mail size={20} className="text-[#009933]" />
              Monthly product email
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Receive one concise email each month with useful products and genuine current offers.
              We do not send daily promotional blasts.
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck size={15} className="text-[#006B2C]" />
              You can switch this off here or unsubscribe from any email.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Monthly product email"
            onClick={toggle}
            disabled={loading || saving}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#009933] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? "bg-[#009933]" : "bg-slate-300 dark:bg-slate-600"}`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>
        {message && (
          <p aria-live="polite" className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
