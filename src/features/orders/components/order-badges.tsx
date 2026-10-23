import { Globe, Phone, Smartphone, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { orderStatusTone, paymentTone, SOURCE_LABEL, titleCase, type Tone } from "../lib/order-utils";
import type { OrderSource, PaymentState, UnifiedOrder } from "../types";

const toneClass: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  neutral: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", toneClass[orderStatusTone(status)])}>
      {titleCase(status || "pending")}
    </Badge>
  );
}

const sourceIcon: Record<OrderSource, typeof Phone> = { app: Smartphone, phone: Phone, website: Globe, other: Store };

export function OrderSourceBadge({ source, unsynced }: { source: OrderSource; unsynced?: boolean }) {
  const Icon = sourceIcon[source];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <Icon className="text-muted-foreground size-3.5" />
      {SOURCE_LABEL[source]}
      {unsynced && (
        <Badge variant="outline" className="border-warning/40 text-warning px-1 py-0 text-[10px]" title="Not found in WooCommerce">
          Not synced
        </Badge>
      )}
    </span>
  );
}

const paymentLabel: Record<PaymentState, string> = {
  paid: "Paid",
  pending: "Due",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export function PaymentBadge({ order }: { order: Pick<UnifiedOrder, "payment"> }) {
  const state = order.payment.state;
  const cod = /cod|cash/i.test(order.payment.method);
  return (
    <Badge variant="outline" className={cn("border-transparent", toneClass[paymentTone(state)])}>
      {state === "pending" && cod ? "COD due" : paymentLabel[state]}
    </Badge>
  );
}
