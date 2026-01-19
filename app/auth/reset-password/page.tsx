"use client";

import { useState, FormEvent, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

import { RiShieldKeyholeLine } from "react-icons/ri";

import AuthHeader from "@/components/ui/auth/AuthHeader";
import AuthCard from "@/components/ui/auth/AuthCard";
import StatusMessage from "@/components/ui/auth/StatusMessage";
import { getFriendlyErrorMessage } from "@/lib/auth/utils";

// Create a separate component for the form
function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent. Check your inbox and spam folder.");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      <AuthHeader />

      <main className="flex-1 flex items-center justify-center p-4">
        <AuthCard
          title="Reset Password"
          subtitle="Enter your email to reset your password"
          icon={<RiShieldKeyholeLine className="w-6 h-6" />}
        >
          <StatusMessage
            error={error}
            success={success}
            onCloseError={() => setError("")}
            onCloseSuccess={() => setSuccess("")}
          />

          <form onSubmit={handleForgotPassword}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
                "Send Reset Email"
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Remember your password?{" "}
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                Back to login
              </Link>
            </p>
          </div>
        </AuthCard>
      </main>
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}