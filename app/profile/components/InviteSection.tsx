"use client";

import React, { useState } from "react";
import { Share2, Copy, MessageCircle } from "lucide-react";
import { incrementInviteCount } from "@/lib/firestoreHelpers";
import { useInvite } from "../hooks/useInvite";
import type { MessageType } from "../types";

interface InviteSectionProps {
  uid: string | null;
  inviteCount: number;
  onError: (message: MessageType) => void;
}

export default function InviteSection({ uid, inviteCount, onError }: InviteSectionProps) {
  const [inviteCopied, setInviteCopied] = useState(false);
  const { inviteLink, copyInviteLink, shareWhatsApp, shareSms } = useInvite({ uid });

  const handleCopyInviteLink = async () => {
    try {
      await copyInviteLink();
      setInviteCopied(true);
      if (uid) {
        await incrementInviteCount(uid);
      }
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      onError({ type: "error", text: "Could not copy link." });
    }
  };

  const handleShareWhatsApp = () => {
    shareWhatsApp();
    if (uid) {
      incrementInviteCount(uid);
    }
  };

  const handleShareSms = () => {
    shareSms();
    if (uid) {
      incrementInviteCount(uid);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      <div className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Share2 size={20} />
          Invite Others
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          Share NuruShop with friends. They&apos;ll get a link to start shopping.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm"
          />
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium transition-colors"
          >
            <Copy size={18} />
            {inviteCopied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium transition-colors"
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={handleShareSms}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            <MessageCircle size={18} />
            SMS
          </button>
        </div>
        {inviteCount > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
            Invites shared:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">{inviteCount}</span>
          </p>
        )}
      </div>
    </section>
  );
}