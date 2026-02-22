"use client";

import { useEffect, useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { RiLockPasswordLine } from "react-icons/ri";

function ConfirmResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!oobCode) {
      setError("Invalid or expired reset link.");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => setEmail(email))
      .catch(() => setError("Invalid or expired reset link."));
  }, [oobCode]);

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!oobCode) return;

    try {
      setLoading(true);
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess("Password updated successfully. Redirecting...");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch {
      setError("Failed to reset password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-8 transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <RiLockPasswordLine className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Set New Password
          </h1>
        </div>

        {email && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Resetting password for <strong>{email}</strong>
          </p>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-500">{error}</p>
        )}

        {success && (
          <p className="mb-4 text-sm text-green-500">{success}</p>
        )}

        {!success && email && (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="password"
              placeholder="New Password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </motion.button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link
            href="/auth/login"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmResetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <ConfirmResetForm />
    </Suspense>
  );
}