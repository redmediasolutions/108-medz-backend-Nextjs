import {
  Timestamp,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { CUSTOMER_COLLECTIONS } from "@/firebase/collections";
import { api } from "@/lib/api";

import { mapAppOrder } from "../lib/app-order-mapper";
import type { AppOrder, WooOrder, WooOrderNote } from "../types";

const ordersCol = () => collection(db, CUSTOMER_COLLECTIONS.orders);

function chunks<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type WooListParams = {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  after?: string;
  before?: string;
  include?: number[];
  createdVia?: string;
};

/** Raw access: WooCommerce via our admin-only /api/woo proxy, app orders via Firestore. */
export const ordersRepository = {
  // ---------------- WooCommerce ----------------
  async wooList(p: WooListParams): Promise<{ orders: WooOrder[]; total: number; totalPages: number }> {
    const q = new URLSearchParams();
    if (p.page) q.set("page", String(p.page));
    if (p.perPage) q.set("per_page", String(p.perPage));
    if (p.status && p.status !== "any") q.set("status", p.status);
    if (p.search) q.set("search", p.search);
    if (p.after) q.set("after", p.after);
    if (p.before) q.set("before", p.before);
    if (p.include?.length) q.set("include", p.include.join(","));
    if (p.createdVia) q.set("created_via", p.createdVia);
    return api.get(`/api/woo/orders?${q}`);
  },

  async wooGet(id: number | string): Promise<{ order: WooOrder | null; notes: WooOrderNote[] }> {
    return api.get(`/api/woo/orders/${id}`);
  },

  /** Every Woo order in a date range (server paginates + caches). */
  async wooAll(range: { after?: string; before?: string; fresh?: boolean }): Promise<{ orders: WooOrder[]; truncated: boolean }> {
    const q = new URLSearchParams();
    if (range.after) q.set("after", range.after);
    if (range.before) q.set("before", range.before);
    if (range.fresh) q.set("fresh", "1");
    return api.get(`/api/woo/orders/all?${q}`);
  },

  // ---------------- Firebase (app) ----------------
  /** Firebase twins for a set of Woo ids — matched by doc id and by the wooOrderId field. */
  async appByWooIds(ids: number[]): Promise<AppOrder[]> {
    if (!ids.length) return [];
    const found = new Map<string, AppOrder>();
    await Promise.all(
      chunks(ids).flatMap((c) => [
        getDocs(query(ordersCol(), where(documentId(), "in", c.map(String)))),
        getDocs(query(ordersCol(), where("wooOrderId", "in", c))),
      ]).map((p) =>
        p.then((snap) => snap.docs.forEach((d) => found.set(d.id, mapAppOrder(d)))).catch(() => undefined)
      )
    );
    return [...found.values()];
  },

  async appGet(id: string): Promise<AppOrder | null> {
    const snap = await getDoc(doc(db, CUSTOMER_COLLECTIONS.orders, id));
    if (snap.exists()) return mapAppOrder(snap);
    if (/^\d+$/.test(id)) {
      const byField = await getDocs(query(ordersCol(), where("wooOrderId", "==", Number(id)), limit(1)));
      if (byField.docs[0]) return mapAppOrder(byField.docs[0]);
    }
    return null;
  },


  /** App orders created on/after a date (single-field range — no composite index needed). */
  async appSince(from: Date | null): Promise<AppOrder[]> {
    const c = from ? [where("createdAt", ">=", Timestamp.fromDate(from)), orderBy("createdAt", "desc")] : [orderBy("createdAt", "desc")];
    const snap = await getDocs(query(ordersCol(), ...c, limit(6000)));
    return snap.docs.map(mapAppOrder);
  },

  /** App orders shipped to a pincode (stored as string or number). */
  async appByPincode(pin: string): Promise<AppOrder[]> {
    const values: (string | number)[] = [pin, Number(pin)];
    const snap = await getDocs(query(ordersCol(), where("shippingAddress.postcode", "in", values), limit(300)));
    return snap.docs.map(mapAppOrder);
  },

  subscribeAppByUid(uid: string, onData: (o: AppOrder[]) => void, onError: (e: Error) => void): Unsubscribe {
    return onSnapshot(query(ordersCol(), where("uid", "==", uid)), (s) => onData(s.docs.map(mapAppOrder)), onError);
  },
};
