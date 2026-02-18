"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from "firebase/auth";
import { doc, getDoc, increment, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";

interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
}

interface UserContextType {
  user: AppUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatUser = (firebaseUser: FirebaseUser | null): AppUser | null => {
    if (!firebaseUser) return null;

    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName,
      email: firebaseUser.email,
      imageUrl: firebaseUser.photoURL,
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(formatUser(firebaseUser));
      setIsLoading(false);

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        getDoc(userRef)
          .then((snap) => {
            const basePayload = {
              email: firebaseUser.email ?? null,
              fullName: firebaseUser.displayName ?? null,
              lastLogin: serverTimestamp(),
            };
            if (!snap.exists()) {
              return setDoc(
                userRef,
                {
                  ...basePayload,
                  createdAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
            return setDoc(userRef, basePayload, { merge: true });
          })
          .catch(() => {
            // ignore profile write errors
          });

        try {
          const ref = localStorage.getItem("nurushop_referrer");
          if (ref && ref === firebaseUser.uid) {
            localStorage.removeItem("nurushop_referrer");
          } else if (ref) {
            const referrerRef = doc(db, "users", ref);
            runTransaction(db, async (tx) => {
              const userSnap = await tx.get(userRef);
              const existingReferrer = userSnap.exists()
                ? String(userSnap.data()?.referredBy ?? "")
                : "";

              if (existingReferrer) return;

              tx.set(
                userRef,
                {
                  referredBy: ref,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );

              tx.set(
                referrerRef,
                {
                  inviteCount: increment(1),
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            })
              .then(() => localStorage.removeItem("nurushop_referrer"))
              .catch(() => {
                // ignore referral attribution errors
              });
          }
        } catch {
          // ignore storage errors
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useAppUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useAppUser must be used inside UserProvider");
  return ctx;
};
