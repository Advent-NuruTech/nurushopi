"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@nuru/types";
import { authApi, ApiClientError } from "@/lib/api";

interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
  phone: string | null;
  address: string | null;
  emailVerified: boolean;
  walletBalance: string;
  referralCode: string | null;
}

interface UserContextType {
  user: AppUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUserFromAuth: (authUser: AuthUser) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function toAppUser(authUser: AuthUser): AppUser {
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    imageUrl: authUser.avatarUrl,
    phone: authUser.phone,
    address: authUser.address,
    emailVerified: authUser.emailVerified,
    walletBalance: authUser.walletBalance,
    referralCode: authUser.referralCode,
  };
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const { user: authUser } = await authApi.me();
      setUser(toAppUser(authUser));
    } catch (err) {
      // 401 → try a silent refresh once, then give up.
      if (err instanceof ApiClientError && err.status === 401) {
        try {
          await authApi.refresh();
          const { user: authUser } = await authApi.me();
          setUser(toAppUser(authUser));
          return;
        } catch {
          // fall through
        }
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const setUserFromAuth = useCallback((authUser: AuthUser) => {
    setUser(toAppUser(authUser));
  }, []);

  return (
    <UserContext.Provider
      value={{ user, isLoading, logout, refresh: loadUser, setUserFromAuth }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useAppUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useAppUser must be used inside UserProvider");
  return ctx;
};
