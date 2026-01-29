"use client";

import React from "react";
import { X } from "lucide-react";
import type { MessageType } from "../types";

interface MessageToastProps {
  message: MessageType;
  onDismiss: () => void;
}

export default function MessageToast({ message, onDismiss }: MessageToastProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-all duration-300 ${
        message.type === "success"
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
          : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
      }`}
    >
      <span>{message.text}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  );
}