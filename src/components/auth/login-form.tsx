"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { sendOtp, signInAsAdmin, verifyOtp } from "@/lib/auth";

const RESEND_SECONDS = 30;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/prescriptions";
  const { status, accessError } = useAuth();

  const [phone, setPhone] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [reqId, setReqId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  const otpSent = reqId !== null;

  // Already signed in as admin → leave the login page (same as go_router redirect).
  React.useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSendOtp() {
    const p = phone.trim();
    if (!/^\d{10}$/.test(p)) {
      setError("Enter a valid 10-digit WhatsApp number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const id = await sendOtp(p);
      setReqId(id);
      setOtp("");
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.trim();
    if (code.length < 4) {
      setError("Enter valid OTP");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await verifyOtp({ phoneNumber: phone.trim(), otp: code, reqId: reqId! });
      await signInAsAdmin(token);
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (otpSent) handleVerifyOtp();
    else handleSendOtp();
  }

  const shownError = error ?? accessError;

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="phone">WhatsApp number</Label>
        <div className="flex">
          <span className="border-input bg-muted text-muted-foreground inline-flex h-9 items-center rounded-l-md border border-r-0 px-3 text-sm">
            +91
          </span>
          <Input
            id="phone"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            maxLength={10}
            value={phone}
            disabled={otpSent || loading}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="rounded-l-none"
            autoFocus
          />
        </div>
      </div>

      {otpSent && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="otp">OTP</Label>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              onClick={() => {
                setReqId(null);
                setOtp("");
                setError(null);
              }}
            >
              <ArrowLeft className="size-3" /> Change number
            </button>
          </div>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter OTP"
            maxLength={6}
            value={otp}
            disabled={loading}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="tracking-[0.4em]"
            autoFocus
          />
          <p className="text-muted-foreground text-xs">
            Sent to +91 {phone}.{" "}
            {cooldown > 0 ? (
              <>Resend in {cooldown}s</>
            ) : (
              <button type="button" className="text-primary font-medium hover:underline" onClick={handleSendOtp}>
                Resend OTP
              </button>
            )}
          </p>
        </div>
      )}

      {shownError && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {shownError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        {otpSent ? "Verify & Login" : "Send OTP"}
      </Button>
    </form>
  );
}
