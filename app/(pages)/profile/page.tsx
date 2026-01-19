'use client';

import React, { useEffect, useState } from "react";
import {
  auth
} from "@/lib/firebase";
import {
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  User
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

export default function ProfilePageClient() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName || "");
        setEmail(u.email || "");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleSave() {
    if (!user) return;

    try {
      // Update display name
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // Update email
      if (email !== user.email && user.email) {
        // Reauthenticate before updating email
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updateEmail(user, email);
      }

      // Update password
      if (newPassword && user.email) {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
      }

      alert("Profile updated successfully!");
    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred";
      
      if (error instanceof FirebaseError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      
      alert("Error: " + errorMessage);
    }
  }

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="p-6 border rounded">
        <h2 className="text-xl font-bold">You must sign in</h2>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="p-4 border rounded">
        <label className="block text-sm font-medium">Display Name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2"
        />

        <label className="block text-sm font-medium mt-4">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2"
        />

        <label className="block text-sm font-medium mt-4">
          Current Password (required for email/password change)
        </label>
        <input
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          type="password"
          className="mt-1 block w-full border rounded px-3 py-2"
        />

        <label className="block text-sm font-medium mt-4">New Password</label>
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          className="mt-1 block w-full border rounded px-3 py-2"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 text-white rounded"
          >
            Save Changes
          </button>

          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 border rounded"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}