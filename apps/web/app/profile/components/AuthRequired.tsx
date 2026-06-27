"use client";

import React from "react";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";

export default function AuthRequired() {
  return (
    <div className="max-w-xl mx-auto py-12 text-center">
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
        <UserIcon className="w-14 h-14 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Sign in to view your profile
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          You need to be signed in to manage orders and profile.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}