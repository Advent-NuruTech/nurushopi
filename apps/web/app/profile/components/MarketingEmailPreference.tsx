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
      const { preference, nextDeliveryLabel } = await merchandisingApi.preferences.save({
        channel: "email",
        topic: "monthly_promotion",
        enabled: next,
        maxPerDay: 1,
        maxPerWeek: 1,
        quietHours: null,
      });
      setEnabled(preference.enabled);
      setMessage(
        preference.enabled
          ? `Thank you for subscribing. Your next product email is scheduled for ${nextDeliveryLabel ?? "the next monthly delivery"}. We also sent this confirmation to your email.`
          : "You are opted out. You will not receive monthly product emails.",
      );
    } catch {
      setMessage("We could not save your preference. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#006B2C] dark:text-[#00C83A]">
            Email preferences
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Manage your subscription
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Your current status is
            <span
              className={`ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-[#DDFBE5] text-[#006B2C]" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              {loading ? "Loading…" : enabled ? "Opted in" : "Opted out"}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Mail size={20} className="text-[#009933]" />
              Monthly product email
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Receive one concise email each month with useful products and genuine current offers.
              We do not send daily promotional blasts. Monthly delivery is at 8:00 AM East Africa
              Time; after opting in, your exact next day will be shown here and emailed to you.
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
