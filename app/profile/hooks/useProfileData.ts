// app/profile/hooks/useProfileData.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { updateProfile, User } from "firebase/auth";
import { getUserProfile, updateUserProfile, type UserProfile as FirestoreUserProfile } from "@/lib/firestoreHelpers";
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
  firebaseUser: User | null;
}

// Helper function to convert FirestoreUserProfile to LocalUserProfile
const convertToLocalProfile = (profile: FirestoreUserProfile | null): LocalUserProfile | null => {
  if (!profile) return null;
  return {
    fullName: profile.fullName,
    phone: profile.phone,
    address: profile.address,
    inviteCount: profile.inviteCount,
    walletBalance: profile.walletBalance,
    referredBy: profile.referredBy ?? null,
    lastLogin: profile.lastLogin,
    createdAt: profile.createdAt,
  };
};

// Helper to safely get string value
const getSafeString = (value?: string | null): string => {
  return value ?? "";
};

export function useProfileData({ uid, appUser, firebaseUser }: UseProfileDataProps) {
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
      const p = await getUserProfile(uid);
      const localProfile = convertToLocalProfile(p);
      setProfile(localProfile);
      setEditFullName(localProfile?.fullName ?? getSafeString(appUser?.name) ?? "");
      setEditPhone(localProfile?.phone ?? "");
      setEditAddress(localProfile?.address ?? "");
      setInviteCount(localProfile?.inviteCount ?? 0);
    } catch {
      setMessage({ type: "error", text: "Failed to load profile." });
    } finally {
      setProfileLoading(false);
    }
  }, [uid, appUser?.name]);

  useEffect(() => {
    if (appUser?.name && !profile?.fullName) setEditFullName(getSafeString(appUser.name));
    if (profile) {
      setEditFullName(profile.fullName ?? getSafeString(appUser?.name) ?? "");
      setEditPhone(profile.phone ?? "");
      setEditAddress(profile.address ?? "");
      setInviteCount(profile.inviteCount ?? 0);
    }
  }, [appUser?.name, profile]);

  const handleSaveProfile = useCallback(async () => {
    if (!uid) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateUserProfile(uid, {
        fullName: editFullName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      if (firebaseUser && editFullName.trim() && editFullName !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName: editFullName.trim() });
      }
      setProfile((p) => ({
        ...p,
        fullName: editFullName.trim() || p?.fullName,
        phone: editPhone.trim() || p?.phone,
        address: editAddress.trim() || p?.address,
      }));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch {
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  }, [uid, editFullName, editPhone, editAddress, firebaseUser]);

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
