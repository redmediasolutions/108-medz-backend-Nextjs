import { Timestamp, type DocumentSnapshot } from "firebase/firestore";

import type { AppOrder, OrderAddress, OrderLineItem } from "../types";

type Raw = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};
const o = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

function addr(v: unknown): OrderAddress {
  const a = o(v);
  return {
    firstName: s(a.first_name ?? a.firstName ?? a.Name),
    lastName: s(a.last_name),
    company: s(a.company),
    address1: s(a.address_1),
    address2: s(a.address_2),
    city: s(a.city),
    state: s(a.state),
    postcode: s(a.postcode ?? a.pincode),
    country: s(a.country),
    phone: s(a.phone ?? a.Phone),
    email: s(a.email),
  };
}

function item(v: unknown): OrderLineItem {
  const i = o(v);
  const qty = n(i.quantity);
  const price = n(i.salePrice ?? i.price);
  return {
    productId: n(i.productId),
    name: s(i.name) || "Unknown",
    sku: "",
    quantity: qty,
    price,
    total: price * qty,
    image: s(i.image),
    requiresPrescription: i.requiresPrescription === true,
  };
}

/** Firestore Orders/{id} → AppOrder */
export function mapAppOrder(snap: DocumentSnapshot): AppOrder {
  const d = (snap.data() ?? {}) as Raw;
  const woo = n(d.wooOrderId) || (/^\d+$/.test(snap.id) ? Number(snap.id) : 0);
  return {
    id: snap.id,
    wooOrderId: woo || null,
    uid: s(d.uid),
    status: s(d.status),
    paymentMethod: s(d.paymentMethod),
    paymentStatus: s(d.paymentStatus),
    razorpayOrderId: s(d.razorpayOrderId),
    razorpayPaymentId: s(d.razorpayPaymentId),
    subtotal: n(d.subtotal),
    shipping: n(d.shipping),
    tax: n(d.tax),
    codCharge: n(d.codCharge),
    walletUsed: n(d.walletUsed),
    finalPayable: n(d.finalPayable),
    rewardAmount: n(d.rewardAmount),
    rewardReleased: d.rewardReleased === true,
    rewardReversed: d.rewardReversed === true,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
    items: Array.isArray(d.items) ? d.items.map(item) : [],
    billing: addr(d.billing),
    shippingAddress: addr(d.shippingAddress),
  };
}
