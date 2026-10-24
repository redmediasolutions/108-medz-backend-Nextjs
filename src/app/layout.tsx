import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "108Medz", template: "%s · 108Medz" },
  description: "108Medz admin CRM — prescriptions, customers and orders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning on <body>: browser extensions (e.g. ColorZilla) add attributes before React loads
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
