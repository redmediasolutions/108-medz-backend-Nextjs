import { Suspense } from "react";
import type { Metadata } from "next";
import { Pill } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <Pill className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">108Medz CRM</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admin login</CardTitle>
          <CardDescription>We&apos;ll send a one-time password to your WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
      <p className="text-muted-foreground mt-6 text-center text-xs">
        CRM System Designed &amp; Developed by Red Media Solutions
      </p>
    </div>
  );
}
