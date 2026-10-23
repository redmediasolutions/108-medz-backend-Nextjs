"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";

import { makeQueryClient } from "@/lib/query-client";

// Devtools only in development; never shipped to production bundles.
const Devtools =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@tanstack/react-query-devtools").then((m) => m.ReactQueryDevtools), { ssr: false })
    : () => null;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      {children}
      <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
