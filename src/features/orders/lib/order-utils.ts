import type { OrderAddress, OrderSource, PaymentState, UnifiedOrder } from "../types";

export type Tone = "success" | "destructive" | "warning" | "neutral" | "info";

export function orderStatusTone(status: string): Tone {
  switch (status.toLowerCase()) {
    case "completed":
    case "delivered":
      return "success";
    case "cancelled":
    case "canceled":
    case "failed":
      return "destructive";
    case "processing":
    case "packed":
    case "shipped":
    case "on-hold":
      return "warning";
    case "refunded":
      return "info";
    default:
      return "neutral";
  }
}

export function paymentTone(state: PaymentState): Tone {
  return { paid: "success", pending: "warning", failed: "destructive", refunded: "info", cancelled: "neutral" }[state] as Tone;
}

export const SOURCE_LABEL: Record<OrderSource, string> = {
  app: "App",
  phone: "Phone / office",
  website: "Website",
  other: "WooCommerce",
};

export const WOO_STATUSES = [
  { value: "any", label: "All statuses" },
  { value: "pending", label: "Pending payment" },
  { value: "processing", label: "Processing" },
  { value: "on-hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

export function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function paymentMethodLabel(o: Pick<UnifiedOrder, "payment">) {
  const { method, methodTitle } = o.payment;
  if (/^cod$/i.test(method) || /cash on delivery/i.test(methodTitle)) return "Cash on delivery";
  if (/razorpay/i.test(method) || /razorpay/i.test(methodTitle)) return "Razorpay";
  const m = methodTitle || method;
  return m ? titleCase(m) : "-";
}

export function addressLines(a: OrderAddress) {
  return [
    a.company,
    a.address1,
    a.address2,
    [a.city, a.state].filter(Boolean).join(", "),
    [a.postcode, a.country].filter(Boolean).join(" "),
  ].filter(Boolean);
}

/** Last 10 digits — how phones are compared across Firebase and Woo. */
export function phoneKey(phone: string) {
  const d = (phone || "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

/** Totals for a customer's order history (cancelled / failed excluded from spend). */
export function summarizeOrders(orders: UnifiedOrder[]) {
  const live = orders.filter(
    (o) =>
      !["cancelled", "canceled", "failed", "refunded"].includes(o.status.toLowerCase()) &&
      !["failed", "cancelled", "refunded"].includes(o.payment.state)
  );
  const spent = live.reduce((s, o) => s + o.total, 0);
  const paid = orders.filter((o) => o.payment.state === "paid").reduce((s, o) => s + o.total - o.refunded, 0);
  const due = live.filter((o) => o.payment.state === "pending").reduce((s, o) => s + o.total, 0);
  const walletUsed = orders.reduce((s, o) => s + o.walletUsed, 0);
  const refunded = orders.reduce((s, o) => s + o.refunded, 0);
  const bySource = orders.reduce<Record<OrderSource, number>>(
    (acc, o) => ((acc[o.source] += 1), acc),
    { app: 0, phone: 0, website: 0, other: 0 }
  );
  return {
    count: orders.length,
    spent,
    paid,
    due,
    walletUsed,
    refunded,
    average: live.length ? spent / live.length : 0,
    lastOrderAt: orders[0]?.createdAt ?? null,
    bySource,
  };
}
