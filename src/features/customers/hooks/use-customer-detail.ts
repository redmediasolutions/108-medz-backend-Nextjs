"use client";

import * as React from "react";
import type { Unsubscribe } from "firebase/firestore";

import { customersService } from "../services/customers.service";
import type { CartItem, Customer, CustomerAddress, CustomerOrder, WalletTransaction } from "../types";

type Sub<T> = (onData: (d: T) => void, onError: (e: Error) => void) => Unsubscribe;

/** Generic realtime subscription state. Pass `null` to stay idle until inputs are ready. */
function useRealtime<T>(subscribe: Sub<T> | null, initial: T, deps: React.DependencyList) {
  const [data, setData] = React.useState<T>(initial);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!subscribe) return;
    setLoading(true);
    return subscribe(
      (d) => {
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setError(e);
        setLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function useCustomer(id: string) {
  return useRealtime<Customer | null>((ok, err) => customersService.subscribeCustomer(id, ok, err), null, [id]);
}

export function useCustomerOrders(authUid: string | undefined) {
  return useRealtime<CustomerOrder[]>(
    authUid ? (ok, err) => customersService.subscribeOrders(authUid, ok, err) : null,
    [],
    [authUid]
  );
}

export function useCustomerCart(authUid: string | undefined) {
  return useRealtime<CartItem[]>(
    authUid ? (ok, err) => customersService.subscribeCart(authUid, ok, err) : null,
    [],
    [authUid]
  );
}

export function useCustomerAddresses(customer: Customer | null) {
  return useRealtime<CustomerAddress[]>(
    customer ? (ok, err) => customersService.subscribeAddresses(customer, ok, err) : null,
    [],
    [customer?.id, customer?.authUid, customer?.phone]
  );
}

export function useWalletTransactions(userId: string | undefined) {
  return useRealtime<WalletTransaction[]>(
    userId ? (ok, err) => customersService.subscribeWallet(userId, ok, err) : null,
    [],
    [userId]
  );
}
