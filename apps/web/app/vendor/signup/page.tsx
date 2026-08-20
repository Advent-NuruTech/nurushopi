"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, ArrowRight } from "lucide-react";
import { VENDOR_DASHBOARD_PATH, VENDOR_LOGIN_PATH, vendorRoute } from "@/lib/vendorPaths";
import { vendorAuthApi, ApiClientError } from "@/lib/api";

function VendorSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const invitedEmail = (searchParams.get("email") ?? "").trim().toLowerCase();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isInviteSignup = !!inviteToken;
  const lockEmail = isInviteSignup && !!invitedEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await vendorAuthApi.signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        inviteToken,
      });
      router.push(vendorRoute(VENDOR_DASHBOARD_PATH));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || "Signup failed");
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isInviteSignup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <UserPlus size={28} />
                Vendor Registration
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Vendor accounts are created by invitation only.
              </p>
            </div>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
              Please contact the NuruShop admin team to get an invite link.
            </p>
          </div>
          <p className="mt-4 text-center">
            <Link href={VENDOR_LOGIN_PATH} className="text-sky-600 dark:text-sky-400 hover:underline font-medium text-sm">
              Already have an account? Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <UserPlus size={28} />
              Accept Vendor Invite
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              You were invited to sell on NuruShop. Complete the form below to activate your vendor account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={lockEmail}
                  aria-readonly={lockEmail}
                  placeholder="vendor@example.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                    lockEmail
                      ? "bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed"
                      : "bg-white dark:bg-slate-800"
                  }`}
                />
              </div>
              {lockEmail && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  This invite is tied to this email address.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium transition-colors"
            >
              {loading ? "Creating account…" : "Create account"}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href={VENDOR_LOGIN_PATH}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm"
          >
            Back to NuruShop
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VendorSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <VendorSignupForm />
    </Suspense>
  );
}
