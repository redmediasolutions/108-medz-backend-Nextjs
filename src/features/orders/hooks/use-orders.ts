"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";

import { ordersService } from "../services/orders.service";
import type { AppOrder, OrderFilters, WooOrder } from "../types";

export const DEFAULT_ORDER_FILTERS: OrderFilters = { source: "all", status: "any", search: "", from: "", to: "" };

/** All / Phone / Website — one WooCommerce page (server-side), enriched with Firebase twins. */
export function useWooOrders(filters: OrderFilters, page: number, pageSize: number, enabled: boolean) {
  const q = useQuery({
    queryKey: qk.orders.woo(filters, page, pageSize),
    queryFn: () => ordersService.wooPage(filters, page, pageSize),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { data: q.data ?? null, loading: enabled && q.isPending, fetching: q.isFetching, error: q.error };
}

/** App / Not synced — every app order since `from` (paginated client-side). */
export function useAppOrders(from: Date, enabled: boolean) {
  const day = from.toISOString().slice(0, 10);
  const q = useQuery<AppOrder[]>({
    queryKey: qk.orders.app(day),
    queryFn: () => ordersService.appSince(from),
    enabled,
    staleTime: 2 * 60_000,
  });
  return { data: q.data ?? [], loading: enabled && q.isPending, fetching: q.isFetching, error: q.error };
}

/** Current WooCommerce state for the app orders visible on one page. */
export function useWooByIds(ids: number[]) {
  const sorted = [...ids].sort((a, b) => a - b);
  const q = useQuery<WooOrder[]>({
    queryKey: qk.orders.wooInclude(sorted),
    queryFn: () => ordersService.wooByIds(sorted),
    enabled: sorted.length > 0,
    placeholderData: keepPreviousData,
  });
  return { data: q.data ?? [], error: q.error ? (q.error as Error).message : null };
}

export function useOrder(key: string) {
  const q = useQuery({
    queryKey: qk.orders.detail(key),
    queryFn: () => ordersService.get(key),
  });
  return {
    order: q.data?.order ?? null,
    notes: q.data?.notes ?? [],
    wooError: q.data?.wooError ?? null,
    loading: q.isPending,
    error: q.error,
  };
}
