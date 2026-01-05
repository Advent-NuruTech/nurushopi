// nurushop/app/profile/page.tsx
'use client';

import React, { useState } from 'react';
import { useUser, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function ProfilePageClient() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [displayName, setDisplayName] = useState<string | undefined>(user?.fullName ?? '');
  const [phone, setPhone] = useState<string | undefined>(user?.phoneNumbers?.[0]?.phoneNumber ?? '');

  // NOTE:
  // Clerk manages user profile server-side. To persist profile edits you'd call
  // a secure server API that uses Clerk SDK to update the user or let Clerk's
  // built-in user settings UI handle updates.

  async function saveProfile() {
    // TODO: implement server call to update user profile via Clerk backend SDK.
    alert('Save profile: implement server-side update using Clerk SDK.');
  }

  if (!isLoaded) return <div className="text-slate-500">Loading profile...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>

      <SignedOut>
        <div className="p-6 border rounded">
          <p className="mb-4">You must be signed in to view or edit your profile.</p>
          <SignInButton>
            <button className="px-4 py-2 bg-sky-600 text-white rounded">Sign in</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-2xl space-y-4">
          <div className="p-4 border rounded">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-xl">
                {user?.firstName?.[0] ?? user?.username?.[0] ?? 'U'}
              </div>
              <div>
                <div className="font-semibold text-lg">{user?.fullName ?? user?.username}</div>
                <div className="text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress ?? 'No email'}</div>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded">
            <label className="block text-sm font-medium">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
            />

            <label className="block text-sm font-medium mt-4">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
            />

            <div className="mt-4 flex gap-2">
              <button onClick={saveProfile} className="px-4 py-2 bg-emerald-600 text-white rounded">
                Save
              </button>
              <button onClick={() => { setDisplayName(user?.fullName ?? ''); setPhone(user?.phoneNumbers?.[0]?.phoneNumber ?? ''); }} className="px-4 py-2 border rounded">
                Reset
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            <p>Security note: To change email or password use Clerk&apos;s secure account management UI or implement server-side Clerk SDK calls.</p>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
