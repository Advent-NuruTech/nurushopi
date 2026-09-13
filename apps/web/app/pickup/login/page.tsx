"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, MapPin } from "lucide-react";
import { ApiClientError, pickupAgentApi } from "@/lib/api";
import { PICKUP_DASHBOARD_PATH } from "@/lib/pickupPaths";

export default function PickupAgentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await pickupAgentApi.login({ email: email.trim().toLowerCase(), password });
      router.replace(PICKUP_DASHBOARD_PATH);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-green-900/15">
            <MapPin size={26} />
          </span>
          <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
            Pickup station portal
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Secure access for NuruShop station agents
          </p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
        >
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Work email
            <span className="relative mt-2 block">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </span>
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Password
            <span className="relative mt-2 block">
              <LockKeyhole
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </span>
          </label>
          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-brand px-4 py-3 font-bold text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in to station"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-brand-strong">
            Back to NuruShop
          </Link>
        </p>
      </div>
    </main>
  );
}
