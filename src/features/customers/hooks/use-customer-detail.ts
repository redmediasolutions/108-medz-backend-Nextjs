"use client";

import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { qk } from "@/lib/query-keys";

import { customersService } from "../services/customers.service";
import type { CartItem, Customer, CustomerAddress, WalletTransaction } from "../types";

/** Realtime pieces of a customer profile, each cached by React Query and kept live by Firestore. */
function state<T>(q: { data: T | undefined; isPending: boolean; error: Error | null }, empty: T, enabled = true) {
  return { data: q.data ?? empty, loading: enabled && q.isPending, error: q.error };
}

export function useCustomer(id: string) {
  const q = useFirestoreQuery<Customer | null>(qk.customers.detail(id), (ok, err) => customersService.subscribeCustomer(id, ok, err));
  return state(q, null);
}

export function useCustomerCart(authUid: string | undefined) {
  const q = useFirestoreQuery<CartItem[]>(
    qk.customers.cart(authUid ?? ""),
    authUid ? (ok, err) => customersService.subscribeCart(authUid, ok, err) : null
  );
  return state(q, [] as CartItem[], Boolean(authUid));
}

export function useCustomerAddresses(customer: Customer | null) {
  const key = customer ? [customer.id, customer.authUid, customer.phone].join("|") : "";
  const q = useFirestoreQuery<CustomerAddress[]>(
    qk.customers.addresses(key),
    customer ? (ok, err) => customersService.subscribeAddresses(customer, ok, err) : null
  );
  return state(q, [] as CustomerAddress[], Boolean(customer));
}

export function useWalletTransactions(userId: string | undefined) {
  const q = useFirestoreQuery<WalletTransaction[]>(
    qk.customers.wallet(userId ?? ""),
    userId ? (ok, err) => customersService.subscribeWallet(userId, ok, err) : null
  );
  return state(q, [] as WalletTransaction[], Boolean(userId));
}
