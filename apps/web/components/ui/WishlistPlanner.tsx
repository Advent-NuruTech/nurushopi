"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarDays, Heart, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { WishlistItemDTO } from "@nuru/types";
import { ApiClientError, wishlistApi } from "@/lib/api";
import { useAppUser } from "@/context/UserContext";
import { Button } from "./button";

export default function WishlistPlanner({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const { user, isLoading: userLoading } = useAppUser();
  const router = useRouter();
  const pathname = usePathname();
  const [item, setItem] = useState<WishlistItemDTO | null>(null);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setItem(null);
      return;
    }
    let cancelled = false;
    wishlistApi
      .getForProduct(productId)
      .then(({ item: saved }) => {
        if (cancelled) return;
        setItem(saved);
        setDate(saved?.plannedPurchaseAt?.slice(0, 10) ?? "");
        setRemindersEnabled(saved?.remindersEnabled ?? false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [productId, user?.id]);

  const openPlanner = () => {
    if (!user && !userLoading) {
      router.push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    setError("");
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { item: saved } = await wishlistApi.save({
        productId,
        plannedPurchaseAt: date ? new Date(`${date}T12:00:00.000Z`) : null,
        remindersEnabled: Boolean(date) && remindersEnabled,
        reminderTimezone: date ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      });
      setItem(saved);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Could not save this item. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      await wishlistApi.remove(productId);
      setItem(null);
      setDate("");
      setRemindersEnabled(false);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not remove this item.");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <>
      <button
        type="button"
        onClick={openPlanner}
        className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${item ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "text-slate-600 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
        aria-pressed={Boolean(item)}
      >
        <Heart size={17} fill={item ? "currentColor" : "none"} />
        {item ? "Saved for later" : "Save for later"}
        {item?.plannedPurchaseAt && (
          <span className="font-normal">
            · {new Date(item.plannedPurchaseAt).toLocaleDateString()}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                  Purchase plan
                </p>
                <h2
                  id="wishlist-title"
                  className="mt-1 text-xl font-bold text-slate-950 dark:text-white"
                >
                  Save {productName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <label
                htmlFor="planned-purchase-date"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <CalendarDays size={18} /> When do you expect to be ready?
              </label>
              <input
                id="planned-purchase-date"
                type="date"
                min={minDate}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  if (!event.target.value) setRemindersEnabled(false);
                }}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              />
              <p className="mt-2 text-xs text-slate-500">
                Optional. You can save the item without choosing a date.
              </p>
            </div>

            <label
              className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${date ? "cursor-pointer border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 opacity-50 dark:border-slate-700"}`}
            >
              <input
                type="checkbox"
                checked={remindersEnabled}
                disabled={!date}
                onChange={(event) => setRemindersEnabled(event.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <BellRing size={17} /> Remind me
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                  We’ll notify you two days before your planned date and follow up two days after if
                  you have not purchased it.
                </span>
              </span>
            </label>

            {error && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {item ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={remove}
                  disabled={saving}
                  className="text-red-600"
                >
                  Remove
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="button"
                onClick={save}
                disabled={saving}
                className="bg-[#009933] text-white hover:bg-[#006B2C]"
              >
                {saving ? "Saving…" : "Save plan"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
