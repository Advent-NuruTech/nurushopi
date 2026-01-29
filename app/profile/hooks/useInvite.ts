"use client";

import { useCallback } from "react";

interface UseInviteProps {
  uid: string | null;
}

export function useInvite({ uid }: UseInviteProps) {
  const getInviteLink = useCallback(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/shop${uid ? `?ref=${uid}` : ""}`;
  }, [uid]);

  const inviteLink = getInviteLink();

  const copyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      return true;
    } catch {
      throw new Error("Failed to copy to clipboard");
    }
  }, [inviteLink]);

  const shareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`Shop natural health & truth products at NuruShop: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }, [inviteLink]);

  const shareSms = useCallback(() => {
    const body = encodeURIComponent(`Shop at NuruShop: ${inviteLink}`);
    window.open(`sms:?body=${body}`, "_blank", "noopener,noreferrer");
  }, [inviteLink]);

  return {
    inviteLink,
    copyInviteLink,
    shareWhatsApp,
    shareSms,
  };
}