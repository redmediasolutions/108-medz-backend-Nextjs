import { Timestamp, type DocumentSnapshot } from "firebase/firestore";

import type {
  CartItem,
  Customer,
  CustomerAddress,
  CustomerOrder,
  OrderAddress,
  OrderItem,
  WalletTransaction,
} from "../types";

type Raw = Record<string, unknown>;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const date = (v: unknown) => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : null);
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

/** Port of Customer.fromFirestore. Falls back to `name` (used by prescriptions) when display_name is missing. */
export function mapCustomer(snap: DocumentSnapshot): Customer {
  const d = (snap.data() ?? {}) as Raw;
  const authUid = str(d.auth_uid ?? d.authUid) || snap.id;
  return {
    id: snap.id,
    authUid,
    name: str(d.display_name) || str(d.name),
    email: str(d.email),
    phone: str(d.phone_number),
    photoUrl: str(d.photo_url),
    createdAt: date(d.created_time),
    isProfileComplete: d.isUserProfileComplete === true,
    isAnonymous: d.isAnonymous === true,
    isAdmin: d.isAdmin === true,
    rewardPoints: num(d.rewardPoints),
  };
}

function mapOrderAddress(v: unknown): OrderAddress {
  const a = obj(v);
  return {
    firstName: str(a.first_name),
    phone: str(a.phone),
    address1: str(a.address_1),
    address2: str(a.address_2),
    city: str(a.city),
    state: str(a.state),
    postcode: str(a.postcode),
    country: str(a.country),
  };
}

function mapOrderItem(v: unknown): OrderItem {
  const i = obj(v);
  return {
    productId: num(i.productId),
    name: str(i.name) || "Unknown",
    image: str(i.image),
    quantity: num(i.quantity),
    salePrice: num(i.salePrice),
    requiresPrescription: i.requiresPrescription === true,
  };
}

export function mapOrder(snap: DocumentSnapshot): CustomerOrder {
  const d = (snap.data() ?? {}) as Raw;
  return {
    id: snap.id,
    wooOrderId: str(d.wooOrderId),
    status: str(d.status) || "pending",
    paymentMethod: str(d.paymentMethod),
    paymentStatus: str(d.paymentStatus),
    subtotal: num(d.subtotal),
    shipping: num(d.shipping),
    walletUsed: num(d.walletUsed),
    finalPayable: num(d.finalPayable),
    createdAt: date(d.createdAt),
    items: Array.isArray(d.items) ? d.items.map(mapOrderItem) : [],
    shippingAddress: mapOrderAddress(d.shippingAddress),
    billing: mapOrderAddress(d.billing),
  };
}

export function mapCartItem(snap: DocumentSnapshot): CartItem {
  const d = (snap.data() ?? {}) as Raw;
  return {
    id: snap.id,
    name: str(d.name) || "Unknown product",
    image: str(d.image),
    contents: str(d.contents),
    mrp: num(d.mrp),
    salePrice: num(d.salePrice),
    quantity: num(d.quantity) || 1,
  };
}

export function mapAddress(snap: DocumentSnapshot): CustomerAddress {
  const d = (snap.data() ?? {}) as Raw;
  const a = obj(d.address);
  return {
    id: snap.id,
    label: str(a.label) || "Home",
    name: str(a.Name),
    phone: str(a.Phone),
    address1: str(a.address_1),
    landmark: str(a.landmark),
    state: str(a.state),
    pincode: str(a.pincode),
    country: str(a.country),
  };
}

export function mapWalletTransaction(snap: DocumentSnapshot): WalletTransaction {
  const d = (snap.data() ?? {}) as Raw;
  return {
    id: snap.id,
    type: str(d.type) || "credit",
    status: str(d.status) || "credited",
    amount: num(d.amount ?? d.points),
    reason: str(d.reason) || "Wallet Transaction",
    orderId: d.orderId != null && str(d.orderId) ? str(d.orderId) : null,
    createdAt: date(d.createdAt),
  };
}
