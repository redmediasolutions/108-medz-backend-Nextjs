"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINRStrict } from "@/lib/format";

import { customersService } from "../services/customers.service";
import type { WalletAdjustment } from "../types";

export type WalletDialogMode = "adjust" | "redeem";

/** Port of _openAdjustDialog / _openRedeemDialog in customer_rewards_screen.dart TEXT */
export function WalletAdjustDialog({
  mode,
  onOpenChange,
  userId,
  customerName,
  available,
}: {
  mode: WalletDialogMode | null;
  onOpenChange: (open: boolean) => void;
  userId: string;
  customerName: string;
  available: number;
}) {
  const open = mode !== null;
  const isRedeem = mode === "redeem";
  const [status, setStatus] = React.useState<WalletAdjustment["status"]>("credited");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStatus("credited");
      setAmount("");
      setReason("");
      setError(null);
    }
  }, [open]);

  const value = Math.trunc(Number(amount) || 0);
  const debiting = isRedeem || status === "debited";
  const overdraw = debiting && value > available;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isRedeem) await customersService.redeem(userId, value, reason);
      else await customersService.adjustWallet(userId, { amount: value, status, reason });
      toast.success(isRedeem ? `Redeemed ${formatINRStrict(value)}` : "Wallet updated");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update wallet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{isRedeem ? "Redeem points for cash" : "Adjust points"}</DialogTitle>
            <DialogDescription>
              {customerName || "Customer"} · available {formatINRStrict(available)}
            </DialogDescription>
          </DialogHeader>

          {!isRedeem && (
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WalletAdjustment["status"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credited">Credited (add to balance)</SelectItem>
                  <SelectItem value="debited">Debited (deduct from balance)</SelectItem>
                  <SelectItem value="pending">Pending (held, not spendable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="wallet-amount">{isRedeem ? "Redeem amount" : "Amount"} (₹)</Label>
            <Input
              id="wallet-amount"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              autoFocus
            />
            {overdraw && (
              <p className="text-warning text-xs">This is more than the available balance; it will floor at ₹0.</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="wallet-reason">Reason</Label>
            <Input
              id="wallet-reason"
              placeholder={isRedeem ? "e.g. Paid cash at store" : "e.g. Goodwill credit"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={debiting ? "destructive" : "default"}
              disabled={busy || value <= 0 || !reason.trim()}
            >
              {busy && <Loader2 className="animate-spin" />}
              {isRedeem ? "Redeem" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
