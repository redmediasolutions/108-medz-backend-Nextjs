import { signInWithCustomToken, signOut as fbSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { api } from "@/lib/api";

export type AdminProfile = {
  uid: string;
  name: string | null;
  phone: string | null;
  isAdmin: boolean;
};

type SendOtpResponse = { success: boolean; reqId?: string; error?: string };
type VerifyOtpResponse = { success: boolean; token?: string; message?: string };

/** Step 1 — MSG91 OTP via Cloud Function `sendMsg91Otp` (proxied through /api/auth/send-otp). */
export async function sendOtp(phoneNumber: string): Promise<string> {
  const data = await api.post<SendOtpResponse>("/api/auth/send-otp", { phoneNumber });
  if (!data.success || !data.reqId) throw new Error(data.error || "Failed to send OTP");
  return data.reqId;
}

/** Step 2 — verify OTP via `verifyMsg91Otp`, which returns a Firebase custom token. */
export async function verifyOtp(params: { phoneNumber: string; otp: string; reqId: string }): Promise<string> {
  const data = await api.post<VerifyOtpResponse>("/api/auth/verify-otp", params);
  if (!data.success || !data.token) throw new Error(data.message || "Invalid OTP");
  return data.token;
}

/** Reads Users/{uid} and returns the admin profile (isAdmin === true required). */
export async function fetchAdminProfile(uid: string): Promise<AdminProfile> {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  const data = snap.exists() ? snap.data() : {};
  return {
    uid,
    name: (data.name as string) ?? (data.display_name as string) ?? null,
    phone: (data.phone_number as string) ?? null,
    isAdmin: data.isAdmin === true,
  };
}

/** Step 3 — sign in with the custom token and enforce the admin check (same as Flutter). */
export async function signInAsAdmin(token: string): Promise<AdminProfile> {
  const cred = await signInWithCustomToken(auth, token);
  const profile = await fetchAdminProfile(cred.user.uid);
  if (!profile.isAdmin) {
    await fbSignOut(auth);
    throw new Error("Access Denied. Admins only.");
  }
  return profile;
}

export function signOut() {
  return fbSignOut(auth);
}
