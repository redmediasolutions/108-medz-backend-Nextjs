import type { AppOrder, OrderAddress, OrderSource, PaymentState, UnifiedOrder, WooOrder } from "../types";

const emptyAddr: OrderAddress = {
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
  phone: "",
  email: "",
};

const hasAddr = (a?: OrderAddress) => Boolean(a && (a.address1 || a.firstName || a.phone));
const fullName = (a: OrderAddress) => [a.firstName, a.lastName].filter(Boolean).join(" ").trim();

function sourceOf(woo: WooOrder | null, app: AppOrder | null): OrderSource {
  if (app) return "app";
  switch (woo?.createdVia) {
    case "admin":
      return "phone";
    case "checkout":
    case "store-api":
      return "website";
    default:
      return "other";
  }
}

function paymentState(woo: WooOrder | null, app: AppOrder | null): PaymentState {
  const status = (woo?.status || app?.status || "").toLowerCase();
  if (status === "refunded") return "refunded";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "failed") return "failed";
  if (woo?.paidAt) return "paid";
  const ps = (app?.paymentStatus || "").toLowerCase();
  if (["paid", "success", "captured", "completed"].includes(ps)) return "paid";
  if (["failed", "expired"].includes(ps)) return "failed";
  // COD is collected on delivery → completed means paid
  if (status === "completed") return "paid";
  return "pending";
}

/** Merge a Woo order and/or its Firebase twin into one row. At least one must be non-null. */
export function mergeOrder(woo: WooOrder | null, app: AppOrder | null): UnifiedOrder {
  const billing = woo?.billing && hasAddr(woo.billing) ? woo.billing : (app?.billing ?? emptyAddr);
  const ship = woo?.shipping && hasAddr(woo.shipping) ? woo.shipping : hasAddr(app?.shippingAddress) ? app!.shippingAddress : billing;
  const createdAt = woo?.createdAt ? new Date(woo.createdAt) : (app?.createdAt ?? null);
  const appTotal = app && app.finalPayable ? app.finalPayable : null;
  const codFee = woo?.fees.find((f) => /cod|cash/i.test(f.name))?.total ?? 0;

  return {
    key: woo ? String(woo.id) : app!.id,
    wooId: woo?.id ?? app?.wooOrderId ?? null,
    appId: app?.id ?? null,
    number: woo?.number || (app?.wooOrderId ? String(app.wooOrderId) : app!.id.slice(0, 8)),
    source: sourceOf(woo, app),
    unsynced: Boolean(app && !woo && !app.wooOrderId),
    // Woo status is what staff update day to day, so it wins
    status: woo?.status || app?.status || "pending",
    createdAt,
    currency: woo?.currency || "INR",

    total: appTotal ?? woo?.total ?? 0,
    wooTotal: woo ? woo.total : null,
    subtotal: app?.subtotal || (woo ? woo.items.reduce((s, i) => s + i.total, 0) : 0),
    shipping: app?.shipping || woo?.shippingTotal || 0,
    tax: app?.tax || woo?.totalTax || 0,
    discount: woo?.discountTotal ?? 0,
    codCharge: app?.codCharge || codFee,
    walletUsed: app?.walletUsed ?? 0,
    refunded: woo?.refundTotal ?? 0,
    rewardAmount: app?.rewardAmount ?? 0,
    rewardReleased: app?.rewardReleased ?? false,
    coupons: woo?.coupons ?? [],
    fees: woo?.fees ?? [],

    payment: {
      method: woo?.paymentMethod || app?.paymentMethod || "",
      methodTitle: woo?.paymentMethodTitle || app?.paymentMethod || "",
      state: paymentState(woo, app),
      rawStatus: app?.paymentStatus || "",
      transactionId: woo?.transactionId || "",
      razorpayOrderId: app?.razorpayOrderId || "",
      razorpayPaymentId: app?.razorpayPaymentId || "",
      paidAt: woo?.paidAt ? new Date(woo.paidAt) : null,
    },

    customer: {
      name: fullName(billing) || fullName(ship) || "Unknown",
      phone: billing.phone || ship.phone,
      email: billing.email,
      uid: app?.uid || null,
      wooCustomerId: woo?.customerId || null,
    },
    billing,
    shippingAddress: ship,
    // Woo line items are authoritative (staff may edit); fall back to app items
    items: woo?.items.length ? woo.items.map((i) => ({ ...i, requiresPrescription: app?.items.find((a) => a.productId === i.productId)?.requiresPrescription ?? false })) : (app?.items ?? []),
    customerNote: woo?.customerNote ?? "",
  };
}

/** Merge lists, de-duplicating app orders that also exist in Woo. Sorted newest first. */
export function mergeOrderLists(woo: WooOrder[], app: AppOrder[]): UnifiedOrder[] {
  const appByWoo = new Map<number, AppOrder>();
  const appOnly: AppOrder[] = [];
  for (const a of app) {
    if (a.wooOrderId) appByWoo.set(a.wooOrderId, a);
    else appOnly.push(a);
  }
  const seen = new Set<number>();
  const out: UnifiedOrder[] = [];
  for (const w of woo) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    out.push(mergeOrder(w, appByWoo.get(w.id) ?? null));
  }
  // App orders whose Woo twin wasn't in this Woo result set
  for (const [id, a] of appByWoo) if (!seen.has(id)) out.push(mergeOrder(null, a));
  for (const a of appOnly) out.push(mergeOrder(null, a));
  return out.sort((x, y) => (y.createdAt?.getTime() ?? 0) - (x.createdAt?.getTime() ?? 0));
}
