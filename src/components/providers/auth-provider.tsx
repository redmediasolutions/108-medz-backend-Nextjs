"use client";

import * as React from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";

import { auth } from "@/firebase/config";
import { fetchAdminProfile, signOut, type AdminProfile } from "@/lib/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  profile: AdminProfile | null;
  /** Set when a signed-in Firebase user is not an admin (they get signed out). */
  accessError: string | null;
  signOut: () => Promise<void>;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<AdminProfile | null>(null);
  const [accessError, setAccessError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // Signed out → drop every cached customer / order so the next admin starts clean
        queryClient.clear();
        setUser(null);
        setProfile(null);
        setStatus("unauthenticated");
        return;
      }

      setStatus("loading");
      try {
        // Flutter only checked isAdmin at login time; we re-check on every session restore.
        const p = await fetchAdminProfile(fbUser.uid);
        if (!p.isAdmin) {
          setAccessError("Access Denied. Admins only.");
          await signOut();
          return;
        }
        setAccessError(null);
        setUser(fbUser);
        setProfile(p);
        setStatus("authenticated");
      } catch {
        setAccessError("Could not verify admin access.");
        await signOut();
      }
    });
  }, [queryClient]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ status, user, profile, accessError, signOut }),
    [status, user, profile, accessError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
