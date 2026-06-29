// app/profile/hooks/useProfileData.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { authApi, walletApi, ApiClientError } from "@/lib/api";
import { useAppUser } from "@/context/UserContext";
import type { UserProfile as LocalUserProfile, MessageType } from "../types";

// Define the exact type from context
type ContextAppUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
};

interface UseProfileDataProps {
  uid: string | null;
  appUser: ContextAppUser | null; // Use context type directly
}

const getSafeString = (value?: string | null): string => value ?? "";

export function useProfileData({ uid, appUser }: UseProfileDataProps) {
  const { setUserFromAuth } = useAppUser();
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [inviteCount, setInviteCount] = useState(0);
  const [message, setMessage] = useState<MessageType | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!uid) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const { user } = await authApi.me();
      const localProfile: LocalUserProfile = {
        fullName: user.name ?? "",
        phone: user.phone ?? "",
        address: user.address ?? "",
        walletBalance: Number(user.walletBalance),
        referredBy: null,
      };
      setProfile(localProfile);
      setEditFullName(localProfile.fullName ?? getSafeString(appUser?.name));
      setEditPhone(localProfile.phone ?? "");
      setEditAddress(localProfile.address ?? "");

      // Invite count comes from the referral program summary (best-effort).
      try {
        const { referral } = await walletApi.referrals();
        setInviteCount(referral.referralCount);
        setProfile((p) => (p ? { ...p, inviteCount: referral.referralCount } : p));
      } catch {
        /* non-fatal — leave the count at 0 */
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load profile." });
    } finally {
      setProfileLoading(false);
    }
  }, [uid, appUser?.name]);

  useEffect(() => {
    if (appUser?.name && !profile?.fullName) setEditFullName(getSafeString(appUser.name));
  }, [appUser?.name, profile?.fullName]);

  const handleSaveProfile = useCallback(async () => {
    if (!uid) return;
    setSaving(true);
    setMessage(null);
    try {
      const { user } = await authApi.updateProfile({
        name: editFullName.trim() || null,
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
      });
      // Keep the global session in sync so the navbar/avatar reflect the change.
      setUserFromAuth(user);
      setProfile((p) => ({
        ...p,
        fullName: user.name ?? "",
        phone: user.phone ?? "",
        address: user.address ?? "",
      }));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [uid, editFullName, editPhone, editAddress, setUserFromAuth]);

  // Dismiss message after 4s
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  return {
    profile,
    profileLoading,
    editFullName,
    setEditFullName,
    editPhone,
    setEditPhone,
    editAddress,
    setEditAddress,
    inviteCount,
    message,
    setMessage,
    saving,
    loadProfile,
    handleSaveProfile,
  };
}
