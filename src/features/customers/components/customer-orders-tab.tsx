"use client";

import * as React from "react";
import { AlertTriangle, ChevronDown, FileText, Package } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { formatINRStrict } from "@/lib/format";
import { formatDateTime } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

import { orderLabel, titleCase } from "../lib/customer-utils";
import type { CustomerOrder, OrderAddress } from "../types";
import { OrderStatusBadge } from "./order-status-badge";

function AddressBlock({ title, a }: { title: string; a: OrderAddress }) {
  const lines = [
    a.address1,
    a.address2,
    [a.city, a.state].filter(Boolean).join(", "),
    [a.postcode, a.country].filter(Boolean).join(" "),
  ].filter(Boolean);
  if (!a.firstName && lines.length === 0) return null;
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground mb-1 text-xs font-medium">{title}</div>
      <div className="text-sm font-medium">{a.firstName || "-"}</div>
      {a.phone && <div className="text-muted-foreground text-sm">{a.phone}</div>}
      <div className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order: o }: { order: CustomerOrder }) {
  const [open, setOpen] = React.useState(false);
  const qty = o.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/40 flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{orderLabel(o)}</span>
            <OrderStatusBadge status={o.status} />
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {formatDateTime(o.createdAt)} · {qty} item{qty === 1 ? "" : "s"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums">{formatINRStrict(o.finalPayable)}</div>
          <div className="text-muted-foreground text-xs">
            {o.paymentMethod ? titleCase(o.paymentMethod) : "-"}
            {o.paymentStatus && ` · ${titleCase(o.paymentStatus)}`}
          </div>
        </div>
        <ChevronDown className={cn("text-muted-foreground size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="bg-muted/20 grid gap-5 border-t px-4 py-4">
          <ul className="grid gap-2">
            {o.items.map((it, i) => (
              <li key={`${it.productId}-${i}`} className="flex items-center gap-3">
                <ProductThumb src={it.image || null} className="size-10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.name}</div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    {it.quantity} × {formatINRStrict(it.salePrice)}
                    {it.requiresPrescription && (
                      <Badge variant="warning" className="px-1.5 py-0">
                        <FileText /> Rx
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums">{formatINRStrict(it.quantity * it.salePrice)}</div>
              </li>
            ))}
          </ul>
          <div className="grid gap-1 border-t pt-3 text-sm sm:ml-auto sm:w-64">
            {o.subtotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatINRStrict(o.subtotal)}</span>
              </div>
            )}
            {o.shipping > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="tabular-nums">{formatINRStrict(o.shipping)}</span>
              </div>
            )}
            {o.walletUsed > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wallet used</span>
                <span className="text-success tabular-nums">−{formatINRStrict(o.walletUsed)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Payable</span>
              <span className="tabular-nums">{formatINRStrict(o.finalPayable)}</span>
            </div>
          </div>
          <div className="grid gap-4 border-t pt-3 sm:grid-cols-2">
            <AddressBlock title="Shipping address" a={o.shippingAddress} />
            <AddressBlock title="Billing" a={o.billing} />
          </div>
        </div>
      )}
    </Card>
  );
}

export function CustomerOrdersTab({
  orders,
  loading,
  error,
}: {
  orders: CustomerOrder[];
  loading: boolean;
  error: Error | null;
}) {
  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Card>
        <EmptyState icon={AlertTriangle} title="Could not load orders" description={error.message} />
      </Card>
    );
  }
  if (orders.length === 0) {
    return (
      <Card>
        <EmptyState icon={Package} title="No orders yet" description="Orders placed from the app will show up here." />
      </Card>
    );
  }
  const spent = orders
    .filter((o) => !["cancelled", "canceled", "failed"].includes(o.status.toLowerCase()))
    .reduce((s, o) => s + o.finalPayable, 0);
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        {orders.length} order{orders.length === 1 ? "" : "s"} · {formatINRStrict(spent)} excluding cancelled
      </p>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}
