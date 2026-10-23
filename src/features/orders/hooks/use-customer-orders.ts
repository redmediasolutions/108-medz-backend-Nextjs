"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { qk } from "@/lib/query-keys";

import { mergeOrderLists } from "../lib/merge-orders";
import { ordersService } from "../services/orders.service";
import type { AppOrder, UnifiedOrder, WooOrder } from "../types";

/**
 * Every order for one person: app orders (Firestore, live, by uid) + WooCommerce orders
 * (phone/office/website, matched by phone or email) — merged and de-duplicated.
 */
export function useCustomerOrders(who: { uid?: string | null; phone?: string; email?: string } | null) {
  const uid = who?.uid ?? "";
  const phone = who?.phone ?? "";
  const email = who?.email ?? "";

  const app = useFirestoreQuery<AppOrder[]>(
    qk.orders.appByUid(uid),
    who && uid ? (ok, err) => ordersService.subscribeAppByUid(uid, ok, err) : null
  );
  const woo = useQuery<WooOrder[]>({
    queryKey: qk.orders.wooForCustomer(phone, email),
    queryFn: () => ordersService.wooForCustomer(phone, email),
    enabled: Boolean(who && (phone || email)),
  });

  const appLoading = Boolean(who && uid) && app.isPending;
  const wooLoading = Boolean(who && (phone || email)) && woo.isPending;
  const orders: UnifiedOrder[] = React.useMemo(() => mergeOrderLists(woo.data ?? [], app.data ?? []), [woo.data, app.data]);

  return {
    orders,
    loading: !who || appLoading || wooLoading,
    appLoading,
    wooLoading,
    appError: app.error,
    wooError: woo.error ? (woo.error as Error).message : null,
  };
}
