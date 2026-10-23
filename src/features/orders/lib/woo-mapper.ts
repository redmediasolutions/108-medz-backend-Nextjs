/**
 * WooCommerce REST v3 order → slim `WooOrder`.
 * Pure TS (no Firebase / DOM), so it runs inside the /api/woo route handlers.
 */
import type { OrderAddress, OrderLineItem, WooOrder, WooOrderNote } from "../types";

type Raw = Record<string, unknown>;

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};
const o = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

/** Woo dates without timezone are site-local; *_gmt are UTC. Prefer GMT. */
function wooDate(gmt: unknown, local: unknown): string | null {
  if (gmt) return `${s(gmt).replace(/Z$/, "")}Z`;
  return local ? s(local) : null;
}

function address(v: unknown): OrderAddress {
  const a = o(v);
  return {
    firstName: s(a.first_name),
    lastName: s(a.last_name),
    company: s(a.company),
    address1: s(a.address_1),
    address2: s(a.address_2),
    city: s(a.city),
    state: s(a.state),
    postcode: s(a.postcode),
    country: s(a.country),
    phone: s(a.phone),
    email: s(a.email),
  };
}

function lineItem(v: unknown): OrderLineItem {
  const i = o(v);
  const qty = n(i.quantity);
  const total = n(i.total);
  return {
    productId: n(i.product_id),
    name: s(i.name) || "Unknown product",
    sku: s(i.sku),
    quantity: qty,
    price: n(i.price) || (qty ? total / qty : 0),
    total,
    image: s(o(i.image).src),
    requiresPrescription: false,
  };
}

export function mapWooOrder(raw: Raw): WooOrder {
  const refunds = Array.isArray(raw.refunds) ? raw.refunds : [];
  const fees = Array.isArray(raw.fee_lines) ? raw.fee_lines : [];
  const coupons = Array.isArray(raw.coupon_lines) ? raw.coupon_lines : [];
  return {
    id: n(raw.id),
    number: s(raw.number) || s(raw.id),
    status: s(raw.status) || "pending",
    createdVia: s(raw.created_via),
    currency: s(raw.currency) || "INR",
    createdAt: wooDate(raw.date_created_gmt, raw.date_created),
    paidAt: wooDate(raw.date_paid_gmt, raw.date_paid),
    completedAt: wooDate(raw.date_completed_gmt, raw.date_completed),
    total: n(raw.total),
    totalTax: n(raw.total_tax),
    shippingTotal: n(raw.shipping_total),
    discountTotal: n(raw.discount_total),
    refundTotal: refunds.reduce((sum: number, r) => sum + Math.abs(n(o(r).total)), 0),
    fees: fees.map((f) => ({ name: s(o(f).name), total: n(o(f).total) })),
    coupons: coupons.map((c) => s(o(c).code)).filter(Boolean),
    customerId: n(raw.customer_id),
    customerNote: s(raw.customer_note),
    paymentMethod: s(raw.payment_method),
    paymentMethodTitle: s(raw.payment_method_title),
    transactionId: s(raw.transaction_id),
    billing: address(raw.billing),
    shipping: address(raw.shipping),
    items: Array.isArray(raw.line_items) ? raw.line_items.map(lineItem) : [],
  };
}

export function mapWooNote(raw: Raw): WooOrderNote {
  return {
    id: n(raw.id),
    author: s(raw.author),
    note: s(raw.note).replace(/<[^>]+>/g, ""),
    customerNote: raw.customer_note === true,
    createdAt: wooDate(raw.date_created_gmt, raw.date_created),
  };
}
