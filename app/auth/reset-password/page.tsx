"use client";

import { useState, FormEvent, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { RiShieldKeyholeLine } from "react-icons/ri";

import AuthHeader from "@/components/ui/auth/AuthHeader";
import AuthCard from "@/components/ui/auth/AuthCard";
import StatusMessage from "@/components/ui/auth/StatusMessage";
import { getFriendlyErrorMessage } from "@/lib/auth/utils";

function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/confirm`,
        handleCodeInApp: false,
      });

      // Security best practice: do not reveal whether email exists
      setSuccess(
        "If an account exists with that email, a secure reset link has been sent."
      );

      setEmail("");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 transition-colors">
      <AuthHeader />

      <main className="flex-1 flex items-center justify-center p-4">
        <AuthCard
          title="Reset Your Password"
          subtitle="Enter your email and we’ll send you a secure reset link"
          icon={<RiShieldKeyholeLine className="w-6 h-6" />}
        >
          <StatusMessage
            error={error}
            success={success}
            onCloseError={() => setError("")}
            onCloseSuccess={() => setSuccess("")}
          />

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Email Address
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </div>
              ) : (
                "Send Reset Link"
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Remember your password?{" "}
            <Link
              href="/auth/login"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Back to login
            </Link>
          </div>
        </AuthCard>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}