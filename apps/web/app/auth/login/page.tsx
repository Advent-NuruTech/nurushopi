"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { motion } from "framer-motion";
import Link from "next/link";

import { FcGoogle } from "react-icons/fc";
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineLock } from "react-icons/ai";

import AuthHeader from "@/components/ui/auth/AuthHeader";
import AuthCard from "@/components/ui/auth/AuthCard";
import AuthHero from "@/components/ui/auth/AuthHero";
import StatusMessage from "@/components/ui/auth/StatusMessage";
import { authApi, ApiClientError } from "@/lib/api";
import { useAppUser } from "@/context/UserContext";

// Login form component
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUserFromAuth } = useAppUser();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const oauthError = searchParams.get("error");
  const signupHref = redirectTo
    ? { pathname: "/auth/signup", query: { redirectTo } }
    : { pathname: "/auth/signup" };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    oauthError ? "Google sign-in could not be completed. Please try again." : "",
  );
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) router.push(redirectTo as Route);
  }, [user, redirectTo, router]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const { user: authUser } = await authApi.login(email, password);
      setUserFromAuth(authUser);
      router.push(redirectTo as Route);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authApi.googleUrl();
  };

  return (
    <div className="min-h-screen bg-[#EFFCF3] lg:flex">
      <AuthHero />
      <main className="relative -mt-8 flex flex-1 items-center justify-center rounded-t-[2rem] bg-white px-4 py-8 sm:px-6 lg:mt-0 lg:rounded-none lg:px-10">
        <AuthCard subtitle="Sign in to your account to continue shopping">
          <StatusMessage
            error={error}
            success={success}
            onCloseError={() => setError("")}
            onCloseSuccess={() => setSuccess("")}
          />

          <form onSubmit={handleEmailLogin}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-800 shadow-sm transition hover:border-[#009933] hover:bg-[#EFFCF3]"
            >
              <FcGoogle className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-wide text-slate-400">or continue with email</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <AiOutlineMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#009933] focus:border-[#009933] outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#009933] focus:border-[#009933] outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </button>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-end">
              <Link
                href="/auth/reset-password"
                className="text-sm text-[#009933] hover:text-[#006B2C] dark:text-[#009933] dark:hover:text-[#006B2C] font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl bg-[#009933] py-3.5 font-semibold text-white shadow-lg shadow-[#009933]/20 transition-all hover:bg-[#006B2C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href={signupHref}
                className="text-[#009933] hover:text-[#006B2C] dark:text-[#009933] dark:hover:text-[#006B2C] font-semibold"
              >
                Sign up
              </Link>
            </p>
          </div>
        </AuthCard>
      </main>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#EFFCF3] p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#009933] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
