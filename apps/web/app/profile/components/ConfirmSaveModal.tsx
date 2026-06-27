"use client";

import React from "react";

interface ConfirmSaveModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmSaveModal({ onClose, onConfirm }: ConfirmSaveModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-6">
        <h3 id="confirm-title" className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Save profile changes?
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          Your name, phone, and address will be updated.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}