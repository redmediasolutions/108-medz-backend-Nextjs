"use client";

import * as React from "react";

import { AuthContext } from "@/components/providers/auth-provider";

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
