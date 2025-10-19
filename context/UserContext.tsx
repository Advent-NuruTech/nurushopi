"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
}

interface UserContextType {
  user: AppUser | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (isLoaded && clerkUser) {
      setUser({
        id: clerkUser.id,
        name: clerkUser.fullName,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        imageUrl: clerkUser.imageUrl ?? null,
      });
    } else if (isLoaded && !clerkUser) {
      setUser(null);
    }
  }, [isLoaded, clerkUser]);

  return (
    <UserContext.Provider value={{ user, isLoading: !isLoaded }}>
      {children}
    </UserContext.Provider>
  );
};

export const useAppUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useAppUser must be used inside UserProvider");
  return ctx;
};
