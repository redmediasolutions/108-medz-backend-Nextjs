"use client";

import { useRouter } from "next/navigation";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINRStrict } from "@/lib/format";
import { formatDateTime, timeAgo } from "@/lib/time-ago";

import { paymentMethodLabel } from "../lib/order-utils";
import type { UnifiedOrder } from "../types";
import { CustomerLink } from "./customer-link";
import { OrderSourceBadge, OrderStatusBadge, PaymentBadge } from "./order-badges";

/** Shared orders table — used on /orders and inside customer profiles (hideCustomer). */
export function OrdersTable({ rows, hideCustomer = false }: { rows: UnifiedOrder[]; hideCustomer?: boolean }) {
  const router = useRouter();
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Order</TableHead>
          <TableHead>Date</TableHead>
          {!hideCustomer && <TableHead>Customer</TableHead>}
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead className="text-right">Items</TableHead>
          <TableHead className="pr-4 text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((o) => {
          const qty = o.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <TableRow key={o.key} className="cursor-pointer" onClick={() => router.push(`/orders/${o.key}`)}>
              <TableCell className="pl-4 font-mono text-sm font-semibold">#{o.number}</TableCell>
              <TableCell title={formatDateTime(o.createdAt)}>
                <div className="text-sm">{o.createdAt ? timeAgo(o.createdAt) : "-"}</div>
              </TableCell>
              {!hideCustomer && (
                <TableCell>
                  <CustomerLink customer={o.customer} className="block max-w-48 truncate font-medium" />
                  <div className="text-muted-foreground text-xs tabular-nums">{o.customer.phone || o.customer.email || "—"}</div>
                </TableCell>
              )}
              <TableCell>
                <OrderSourceBadge source={o.source} unsynced={o.unsynced} />
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={o.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <PaymentBadge order={o} />
                  <span className="text-muted-foreground max-w-32 truncate text-xs">{paymentMethodLabel(o)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{qty}</TableCell>
              <TableCell className="pr-4 text-right font-semibold tabular-nums">
                {formatINRStrict(o.total)}
                {o.walletUsed > 0 && (
                  <div className="text-muted-foreground text-[11px] font-normal">+{formatINRStrict(o.walletUsed)} wallet</div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
