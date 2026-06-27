"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserIcon, Phone, MapPin, Pencil } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface UpdateProfileProps {
  editFullName: string;
  editPhone: string;
  editAddress: string;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSave: () => Promise<void> | void;
  saving: boolean;
}

export default function UpdateProfile({
  editFullName,
  editPhone,
  editAddress,
  onFullNameChange,
  onPhoneChange,
  onAddressChange,
  onSave,
  saving,
}: UpdateProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const wasSaving = useRef(false);

  // Close editor ONLY after a save completes
  useEffect(() => {
    if (wasSaving.current && !saving) {
      setIsEditing(false);
    }
    wasSaving.current = saving;
  }, [saving]);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserIcon size={20} />
            Profile
          </h2>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              <Pencil size={14} />
              Edit profile
            </button>
          )}
        </div>

        {isEditing && (
          <>
            <div className="grid gap-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full name
                </label>
                <input
                  value={editFullName}
                  onChange={(e) => onFullNameChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Phone size={14} />
                  Phone
                </label>
                <input
                  value={editPhone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <MapPin size={14} />
                  Address
                </label>
                <textarea
                  rows={3}
                  value={editAddress}
                  onChange={(e) => onAddressChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border resize-none"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-xl"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size={18} />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
