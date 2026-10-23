"use client";

import * as React from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, Clock, SlidersHorizontal, Undo2, Wallet } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINRStrict } from "@/lib/format";
import { formatDateTime } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

import { WalletAdjustDialog, type WalletDialogMode } from "../addform/wallet-adjust-dialog";
import { walletSummary } from "../lib/customer-utils";
import type { WalletTransaction } from "../types";
import { WalletBalanceCard } from "./wallet-balance-card";

function txMeta(tx: WalletTransaction) {
  if (tx.status === "pending")
    return { title: "Pending reward", icon: Clock, tone: "text-warning bg-warning/15", sign: "+", amountTone: "text-warning" };
  if (tx.status === "reversed")
    return { title: "Reward reversed (order cancelled)", icon: Undo2, tone: "text-destructive bg-destructive/10", sign: "−", amountTone: "text-destructive" };
  if (tx.type === "credit")
    return { title: "Wallet credit", icon: ArrowDownLeft, tone: "text-success bg-success/15", sign: "+", amountTone: "text-success" };
  return { title: "Wallet debit", icon: ArrowUpRight, tone: "text-destructive bg-destructive/10", sign: "−", amountTone: "text-destructive" };
}

/** Port of CustomerRewardsScreen — Users/{id}/walletTransactions */
export function CustomerRewardsTab({
  userId,
  customerName,
  transactions,
  loading,
  error,
}: {
  userId: string;
  customerName: string;
  transactions: WalletTransaction[];
  loading: boolean;
  error: Error | null;
}) {
  const [mode, setMode] = React.useState<WalletDialogMode | null>(null);
  const { available, pending } = walletSummary(transactions);
  const pager = usePageState(10);
  const view = paginate(transactions, pager.page, pager.pageSize);

  return (
    <div className="grid gap-4">
      <WalletBalanceCard
        available={available}
        pending={pending}
        loading={loading}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setMode("adjust")}>
              <SlidersHorizontal /> Adjust points
            </Button>
            <Button
              size="sm"
              className="bg-white/15 text-primary-foreground hover:bg-white/25"
              onClick={() => setMode("redeem")}
            >
              <Banknote /> Redeem for cash
            </Button>
          </>
        }
      />

      <Card className="gap-0 py-0">
        <div className="border-b px-4 py-3 text-sm font-medium">Wallet transactions</div>
        {loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={AlertTriangle} title="Error loading wallet history" description={error.message} />
        ) : transactions.length === 0 ? (
          <EmptyState icon={Wallet} title="No wallet transactions yet" />
        ) : (
          <ul className="divide-y">
            {view.items.map((tx) => {
              const m = txMeta(tx);
              const Icon = m.icon;
              return (
                <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", m.tone)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {tx.orderId && <span className="text-foreground font-mono font-medium select-all">Order #{tx.orderId} · </span>}
                      {tx.reason}
                    </div>
                    <div className="text-muted-foreground text-[11px]">{formatDateTime(tx.createdAt)}</div>
                  </div>
                  <div className={cn("text-sm font-semibold tabular-nums", m.amountTone)}>
                    {m.sign}
                    {formatINRStrict(tx.amount)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {view.total > 10 && <DataPagination className="border-t px-4 py-3" state={{ ...pager, page: view.page }} total={view.total} itemLabel="transactions" />}
      </Card>

      <WalletAdjustDialog
        mode={mode}
        onOpenChange={(o) => !o && setMode(null)}
        userId={userId}
        customerName={customerName}
        available={available}
      />
    </div>
  );
}
