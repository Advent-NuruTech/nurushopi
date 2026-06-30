"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, ArrowRight, KeyRound } from "lucide-react";
import { ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH, adminRoute } from "@/lib/adminPaths";
import { adminAuthApi, ApiClientError } from "@/lib/api";

function AdminSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const invitedEmail = (searchParams.get("email") ?? "").trim().toLowerCase();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [seniorCode, setSeniorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isInviteSignup = !!inviteToken;
  // Lock the email to the invited address when the link carries it: the server
  // rejects an invite redeemed with any other email, so editing it can only break
  // the flow. Legacy links without an email param stay editable as a fallback.
  const lockEmail = isInviteSignup && !!invitedEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminAuthApi.signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(inviteToken
          ? { inviteToken }
          : { seniorCode: seniorCode.trim() }),
      });
      router.push(adminRoute(ADMIN_DASHBOARD_PATH));
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <UserPlus size={28} />
              {isInviteSignup ? "Accept Admin Invite" : "Create Senior Admin"}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isInviteSignup
                ? "You were invited to join NuruShop. Complete the form below to activate your admin account."
                : "Register the first admin (Senior) for NuruShop."}
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
                  placeholder="admin@nurushop.co.ke"
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
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            {!isInviteSignup && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Senior admin code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={seniorCode}
                    onChange={(e) => setSeniorCode(e.target.value)}
                    required
                    placeholder="Provided by NuruShop"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Required to register as a Senior Admin.
                </p>
              </div>
            )}

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
              href={ADMIN_LOGIN_PATH}
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
            ← Back to NuruShop
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <AdminSignupForm />
    </Suspense>
  );
}
