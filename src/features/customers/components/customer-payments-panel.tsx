"use client";

import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentBadge } from "@/features/orders/components/order-badges";
import { paymentMethodLabel, summarizeOrders } from "@/features/orders/lib/order-utils";
import type { UnifiedOrder } from "@/features/orders/types";
import { formatINRStrict } from "@/lib/format";
import { formatDateTime } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

/** Every payment across the customer's orders: what's paid, what's due, refunds, wallet and gateway references. */
export function CustomerPaymentsPanel({ orders, loading }: { orders: UnifiedOrder[]; loading: boolean }) {
  const router = useRouter();
  const s = summarizeOrders(orders);
  const pager = usePageState(10);
  const view = paginate(orders, pager.page, pager.pageSize);
  const methods = orders.reduce<Record<string, number>>((acc, o) => {
    const m = paymentMethodLabel(o);
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});

  const cards = [
    { label: "Paid", value: s.paid, tone: "text-success" },
    { label: "Due", value: s.due, tone: s.due > 0 ? "text-warning" : "" },
    { label: "Refunded", value: s.refunded, tone: s.refunded ? "text-destructive" : "" },
    { label: "Wallet used", value: s.walletUsed, tone: "" },
  ];

  if (loading && orders.length === 0) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (orders.length === 0) {
    return (
      <Card>
        <EmptyState icon={CreditCard} title="No payments yet" />
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="gap-0 px-4 py-3">
            <div className="text-muted-foreground text-xs">{c.label}</div>
            <div className={cn("text-lg font-semibold tabular-nums", c.tone)}>{formatINRStrict(c.value)}</div>
          </Card>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Methods used: {Object.entries(methods).map(([m, n]) => `${m} (${n})`).join(" · ")}
      </p>
      <Card className="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Date</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Wallet</TableHead>
              <TableHead className="pr-4 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.items.map((o) => {
              const ref = o.payment.razorpayPaymentId || o.payment.transactionId || o.payment.razorpayOrderId;
              return (
                <TableRow key={o.key} className="cursor-pointer" onClick={() => router.push(`/orders/${o.key}`)}>
                  <TableCell className="pl-4 text-sm">{formatDateTime(o.payment.paidAt ?? o.createdAt)}</TableCell>
                  <TableCell className="font-mono text-sm font-medium">#{o.number}</TableCell>
                  <TableCell className="text-sm">{paymentMethodLabel(o)}</TableCell>
                  <TableCell>
                    <PaymentBadge order={o} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-40 truncate font-mono text-xs" title={ref}>
                    {ref || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{o.walletUsed ? formatINRStrict(o.walletUsed) : "—"}</TableCell>
                  <TableCell className="pr-4 text-right font-semibold tabular-nums">
                    {formatINRStrict(o.total)}
                    {o.refunded > 0 && <div className="text-destructive text-[11px] font-normal">−{formatINRStrict(o.refunded)} refunded</div>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {view.total > 10 && <DataPagination className="border-t px-4 py-3" state={{ ...pager, page: view.page }} total={view.total} itemLabel="payments" />}
      </Card>
    </div>
  );
}
