"use client";

import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Copy, ExternalLink, FileQuestion, FileText, MessageSquare, User } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { formatINRStrict } from "@/lib/format";
import { formatDateTime, timeAgo } from "@/lib/time-ago";

import { useOrder } from "../hooks/use-orders";
import { addressLines, paymentMethodLabel } from "../lib/order-utils";
import type { OrderAddress } from "../types";
import { customerHref } from "./customer-link";
import { OrderSourceBadge, OrderStatusBadge, PaymentBadge } from "./order-badges";

const STORE = process.env.NEXT_PUBLIC_STORE_BASE_URL ?? "https://janmanstore.in";

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2" asChild>
      <Link href="/orders">
        <ArrowLeft /> Orders
      </Link>
    </Button>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: React.ReactNode; tone?: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function CopyValue({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <button
        type="button"
        className="hover:text-primary inline-flex min-w-0 items-center gap-1 font-mono text-xs"
        onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`))}
      >
        <span className="truncate">{value}</span>
        <Copy className="size-3 shrink-0" />
      </button>
    </div>
  );
}

function AddressCard({ title, a }: { title: string; a: OrderAddress }) {
  const lines = addressLines(a);
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground mb-1 text-xs font-medium">{title}</div>
      {name || lines.length ? (
        <>
          {name && <div className="text-sm font-medium">{name}</div>}
          {a.phone && <div className="text-muted-foreground text-sm tabular-nums">{a.phone}</div>}
          <div className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {lines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground text-sm">—</div>
      )}
    </div>
  );
}

export function OrderDetail({ orderKey }: { orderKey: string }) {
  const { order: o, notes, loading, error, wooError } = useOrder(orderKey);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink />
        <Skeleton className="mb-6 h-8 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }
  if (error || !o) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink />
        <Card>
          <EmptyState
            icon={error ? AlertTriangle : FileQuestion}
            title={error ? "Something went wrong" : "Order not found"}
            description={error?.message ?? wooError ?? "No WooCommerce or app order with this number."}
          />
        </Card>
      </div>
    );
  }

  const rxCount = o.items.filter((i) => i.requiresPrescription).length;
  const totalsDiffer = o.wooTotal !== null && o.appId && Math.abs(o.wooTotal - o.total) > 0.5;

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">#{o.number}</h1>
        <OrderStatusBadge status={o.status} />
        <PaymentBadge order={o} />
        <span className="text-muted-foreground text-sm">
          {formatDateTime(o.createdAt)} · {o.createdAt ? timeAgo(o.createdAt) : ""}
        </span>
        <div className="flex-1" />
        {o.wooId && (
          <Button variant="outline" size="sm" asChild>
            <a href={`${STORE}/wp-admin/post.php?post=${o.wooId}&action=edit`} target="_blank" rel="noreferrer">
              Open in WooCommerce <ExternalLink />
            </a>
          </Button>
        )}
      </div>

      {wooError && (
        <div className="bg-warning/10 text-warning mb-4 flex items-start gap-2 rounded-lg px-4 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> WooCommerce details unavailable: {wooError}
        </div>
      )}
      {o.unsynced && (
        <div className="bg-warning/10 text-warning mb-4 flex items-start gap-2 rounded-lg px-4 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> This app order was never created in WooCommerce
          {o.payment.rawStatus ? ` (payment status: ${o.payment.rawStatus})` : ""}.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card className="gap-0 pb-0">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                Items
                {rxCount > 0 && (
                  <Badge variant="warning">
                    <FileText /> {rxCount} need Rx
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <ul className="divide-y">
              {o.items.map((it, i) => (
                <li key={`${it.productId}-${i}`} className="flex items-center gap-3 px-6 py-3">
                  <ProductThumb src={it.image || null} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.name}</div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                      <span>
                        {it.quantity} × {formatINRStrict(it.price)}
                      </span>
                      {it.productId > 0 && <span className="font-mono">#{it.productId}</span>}
                      {it.sku && <span>SKU {it.sku}</span>}
                      {it.requiresPrescription && <span className="text-warning font-medium">Rx</span>}
                    </div>
                  </div>
                  <div className="text-sm font-medium tabular-nums">{formatINRStrict(it.total)}</div>
                </li>
              ))}
              {o.items.length === 0 && <li className="text-muted-foreground px-6 py-6 text-sm">No items recorded.</li>}
            </ul>
            <div className="grid gap-1.5 border-t px-6 py-4 text-sm sm:ml-auto sm:w-80">
              <Row label="Subtotal" value={formatINRStrict(o.subtotal)} />
              {o.discount > 0 && <Row label={`Discount${o.coupons.length ? ` (${o.coupons.join(", ")})` : ""}`} value={`−${formatINRStrict(o.discount)}`} tone="text-success" />}
              {o.shipping > 0 && <Row label="Shipping" value={formatINRStrict(o.shipping)} />}
              {o.tax > 0 && <Row label="Tax" value={formatINRStrict(o.tax)} />}
              {o.codCharge > 0 && <Row label="COD charge" value={formatINRStrict(o.codCharge)} />}
              {o.fees
                .filter((f) => !/cod|cash/i.test(f.name) || !o.codCharge)
                .map((f) => (
                  <Row key={f.name} label={f.name || "Fee"} value={formatINRStrict(f.total)} />
                ))}
              {o.walletUsed > 0 && <Row label="Wallet used" value={`−${formatINRStrict(o.walletUsed)}`} tone="text-success" />}
              <div className="my-1 border-t" />
              <Row label={o.payment.state === "paid" ? "Paid" : "Payable"} value={formatINRStrict(o.total)} strong />
              {o.refunded > 0 && <Row label="Refunded" value={`−${formatINRStrict(o.refunded)}`} tone="text-destructive" />}
              {totalsDiffer && (
                <p className="text-muted-foreground pt-1 text-xs">WooCommerce total is {formatINRStrict(o.wooTotal!)} (before app wallet adjustments).</p>
              )}
            </div>
          </Card>

          <Card>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <AddressCard title="Shipping address" a={o.shippingAddress} />
              <AddressCard title="Billing address" a={o.billing} />
            </CardContent>
          </Card>

          {(notes.length > 0 || o.customerNote) && (
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-4" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {o.customerNote && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="text-muted-foreground mb-1 text-xs font-medium">Customer note</div>
                    {o.customerNote}
                  </div>
                )}
                {notes.map((n) => (
                  <div key={n.id} className="border-l-2 pl-3 text-sm">
                    <div>{n.note}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {n.author || "system"} · {n.createdAt ? formatDateTime(new Date(n.createdAt)) : ""}
                      {n.customerNote && " · sent to customer"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1.5 text-sm">
              <div className="font-medium">{o.customer.name}</div>
              {o.customer.phone && <div className="text-muted-foreground tabular-nums">{o.customer.phone}</div>}
              {o.customer.email && <div className="text-muted-foreground truncate">{o.customer.email}</div>}
              <div className="mt-2">
                <OrderSourceBadge source={o.source} unsynced={o.unsynced} />
              </div>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href={customerHref(o.customer)}>
                  <User /> View customer profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span>{paymentMethodLabel(o)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <PaymentBadge order={o} />
              </div>
              {o.payment.paidAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid on</span>
                  <span>{formatDateTime(o.payment.paidAt)}</span>
                </div>
              )}
              <CopyValue label="Transaction ID" value={o.payment.transactionId} />
              <CopyValue label="Razorpay order" value={o.payment.razorpayOrderId} />
              <CopyValue label="Razorpay payment" value={o.payment.razorpayPaymentId} />
              {o.walletUsed > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Wallet used</span>
                  <span className="tabular-nums">{formatINRStrict(o.walletUsed)}</span>
                </div>
              )}
              {o.rewardAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reward</span>
                  <span className="tabular-nums">
                    {formatINRStrict(o.rewardAmount)}{" "}
                    <span className="text-muted-foreground text-xs">{o.rewardReleased ? "released" : "pending"}</span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Records</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1.5 text-sm">
              <CopyValue label="WooCommerce ID" value={o.wooId ? String(o.wooId) : ""} />
              <CopyValue label="App order doc" value={o.appId ?? ""} />
              <CopyValue label="Firebase UID" value={o.customer.uid ?? ""} />
              {!o.wooId && !o.appId && <span className="text-muted-foreground">—</span>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
