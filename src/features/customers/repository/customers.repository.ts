import {
  Timestamp,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { COLLECTIONS, CUSTOMER_COLLECTIONS as C } from "@/firebase/collections";
import { phoneVariants } from "@/lib/format";

import {
  mapAddress,
  mapCartItem,
  mapCustomer,
  mapWalletTransaction,
} from "../lib/customer-mapper";
import { parseDateInput } from "../lib/customer-utils";
import type {
  CartItem,
  Customer,
  CustomerAddress,
  CustomerFilters,
  WalletAdjustment,
  WalletTransaction,
} from "../types";

export type CustomerCursor = QueryDocumentSnapshot | null;

/** Date-range constraints on Users.created_time (the Flutter app accepted dates but never applied them). */
function dateConstraints(f: Pick<CustomerFilters, "from" | "to">): QueryConstraint[] {
  const out: QueryConstraint[] = [];
  const from = parseDateInput(f.from);
  const to = parseDateInput(f.to, true);
  if (from) out.push(where("created_time", ">=", Timestamp.fromDate(from)));
  if (to) out.push(where("created_time", "<=", Timestamp.fromDate(to)));
  return out;
}

const users = () => collection(db, COLLECTIONS.users);

/** Raw Firestore access for customers — mirrors lib/services/firestore.dart + customer sheets. */
export const customersRepository = {
  async fetchPage(
    filters: CustomerFilters,
    cursor: CustomerCursor,
    pageSize: number
  ): Promise<{ items: Customer[]; cursor: CustomerCursor; hasMore: boolean }> {
    let q;
    if (filters.phone.trim()) {
      // Phone search: exact match on phone_number (tries 98..., +9198..., 9198...)
      q = query(users(), where("phone_number", "in", phoneVariants(filters.phone)), limit(pageSize));
    } else {
      const c: QueryConstraint[] = [...dateConstraints(filters), orderBy("created_time", "desc")];
      if (cursor) c.push(startAfter(cursor));
      c.push(limit(pageSize));
      q = query(users(), ...c);
    }
    const snap = await getDocs(q);
    const last = snap.docs.at(-1) ?? null;
    return {
      items: snap.docs.map(mapCustomer),
      cursor: last,
      hasMore: !filters.phone.trim() && snap.docs.length === pageSize,
    };
  },

  async count(filters: Pick<CustomerFilters, "from" | "to">): Promise<number> {
    const c = dateConstraints(filters);
    const snap = await getCountFromServer(c.length ? query(users(), ...c) : users());
    return snap.data().count;
  },

  /** For CSV export — pages through Users in batches of 500 up to `max`. */
  async fetchAll(filters: Pick<CustomerFilters, "from" | "to">, max = 5000): Promise<Customer[]> {
    const out: Customer[] = [];
    let cursor: QueryDocumentSnapshot | null = null;
    while (out.length < max) {
      const c: QueryConstraint[] = [...dateConstraints(filters), orderBy("created_time", "desc")];
      if (cursor) c.push(startAfter(cursor));
      c.push(limit(Math.min(500, max - out.length)));
      const snap = await getDocs(query(users(), ...c));
      out.push(...snap.docs.map(mapCustomer));
      if (snap.docs.length < 500) break;
      cursor = snap.docs[snap.docs.length - 1];
    }
    return out;
  },

  /** Find the Users doc for an order's customer: by doc id = uid, auth_uid field, then phone variants. */
  async findCustomerId(by: { uid?: string; phone?: string }): Promise<string | null> {
    if (by.uid) {
      const direct = await getDoc(doc(db, COLLECTIONS.users, by.uid)).catch(() => null);
      if (direct?.exists()) return direct.id;
      const field = await getDocs(query(users(), where("auth_uid", "==", by.uid), limit(1))).catch(() => null);
      if (field?.docs[0]) return field.docs[0].id;
    }
    if (by.phone && by.phone.replace(/\D/g, "").length >= 10) {
      const snap = await getDocs(query(users(), where("phone_number", "in", phoneVariants(by.phone)), limit(1)));
      if (snap.docs[0]) return snap.docs[0].id;
    }
    return null;
  },

  subscribeCustomer(id: string, onData: (c: Customer | null) => void, onError: (e: Error) => void): Unsubscribe {
    return onSnapshot(
      doc(db, COLLECTIONS.users, id),
      (s) => onData(s.exists() ? mapCustomer(s) : null),
      onError
    );
  },


  subscribeCart(authUid: string, onData: (i: CartItem[]) => void, onError: (e: Error) => void): Unsubscribe {
    return onSnapshot(
      collection(db, C.carts, authUid, C.cartItems),
      (s) => onData(s.docs.map(mapCartItem)),
      onError
    );
  },

  updateCartQuantity(authUid: string, itemId: string, quantity: number) {
    return updateDoc(doc(db, C.carts, authUid, C.cartItems, itemId), {
      quantity,
      updatedAt: serverTimestamp(),
    });
  },

  removeCartItem(authUid: string, itemId: string) {
    return deleteDoc(doc(db, C.carts, authUid, C.cartItems, itemId));
  },

  async clearCart(authUid: string) {
    const snap = await getDocs(collection(db, C.carts, authUid, C.cartItems));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  /**
   * Addresses whose userRef points at this customer. Flutter streamed the whole collection and
   * filtered client-side; here we query userRef `in` [DocumentReference | "Users/x" string] variants.
   */
  subscribeAddresses(
    customer: Pick<Customer, "id" | "authUid" | "phone">,
    onData: (a: CustomerAddress[]) => void,
    onError: (e: Error) => void
  ): Unsubscribe {
    const ids = new Set([customer.authUid, customer.id]);
    if (customer.phone) {
      ids.add(customer.phone);
      ids.add(customer.phone.replace("+", "").trim());
    }
    const refs: unknown[] = [];
    ids.forEach((id) => {
      if (!id) return;
      refs.push(doc(db, COLLECTIONS.users, id), `Users/${id}`, `/Users/${id}`);
    });
    return onSnapshot(
      query(collection(db, C.addresses), where("userRef", "in", refs.slice(0, 30))),
      (s) => onData(s.docs.map(mapAddress)),
      onError
    );
  },

  subscribeWallet(userId: string, onData: (t: WalletTransaction[]) => void, onError: (e: Error) => void): Unsubscribe {
    return onSnapshot(
      query(collection(db, COLLECTIONS.users, userId, C.walletTransactions), orderBy("createdAt", "desc")),
      (s) => onData(s.docs.map(mapWalletTransaction)),
      onError
    );
  },

  /** Port of RewardsService.adjustPoints — updates Users.rewardPoints and logs a walletTransactions entry. */
  async adjustWallet(userId: string, adj: WalletAdjustment) {
    const userRef = doc(db, COLLECTIONS.users, userId);
    const type = adj.status === "debited" ? "debit" : "credit";
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      const current = Number(snap.data()?.rewardPoints ?? 0) || 0;
      const updated = type === "credit" ? current + adj.amount : current - adj.amount;
      tx.update(userRef, { rewardPoints: Math.max(0, updated) });
      tx.set(doc(collection(userRef, C.walletTransactions)), {
        type,
        status: adj.status,
        amount: adj.amount,
        reason: adj.reason,
        createdAt: serverTimestamp(),
      });
    });
  },
};
