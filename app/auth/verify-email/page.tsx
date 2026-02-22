"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RiShieldCheckLine } from "react-icons/ri";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { applyActionCode } from "firebase/auth";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!oobCode) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus("success");
        setMessage(
          "Your email has been verified successfully! Redirecting to login..."
        );
        setTimeout(() => router.push("/auth/login"), 3000);
      })
      .catch(() => {
        setStatus("error");
        setMessage(
          "This verification link is invalid or has already been used."
        );
      });
  }, [oobCode, router]);

  const statusColor =
    status === "success"
      ? "green-500"
      : status === "error"
      ? "red-500"
      : "blue-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl text-center transition-colors">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`inline-flex p-4 rounded-full bg-${statusColor} bg-opacity-20 mb-6`}
        >
          <RiShieldCheckLine
            className={`w-8 h-8 text-${statusColor}`}
          />
        </motion.div>

        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {status === "success" ? "Email Verified!" : "Verification Status"}
        </h1>

        <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>

        {status === "error" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/auth/login")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Back to Login
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <VerifyEmailPageContent />
    </Suspense>
  );
}