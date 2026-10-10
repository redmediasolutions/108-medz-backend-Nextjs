"use client";

import * as React from "react";

import { customersService, type CustomerCursor } from "../services/customers.service";
import type { Customer, CustomerFilters } from "../types";

export const EMPTY_FILTERS: CustomerFilters = { phone: "", from: "", to: "" };

/** Cursor-paginated Users list (port of CustomersScreen._loadCustomers) + total count. */
export function useCustomers(filters: CustomerFilters) {
  const [items, setItems] = React.useState<Customer[]>([]);
  const [cursor, setCursor] = React.useState<CustomerCursor>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [total, setTotal] = React.useState<number | null>(null);
  const requestId = React.useRef(0);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    customersService
      .fetchPage(filters)
      .then((r) => {
        if (id !== requestId.current) return;
        setItems(r.items);
        setCursor(r.cursor);
        setHasMore(r.hasMore);
      })
      .catch((e: Error) => {
        if (id !== requestId.current) return;
        console.error("[customers] fetch error", e);
        setError(e);
        setItems([]);
      })
      .finally(() => id === requestId.current && setLoading(false));

    setTotal(null);
    if (!filters.phone.trim()) {
      customersService
        .count(filters)
        .then((n) => id === requestId.current && setTotal(n))
        .catch(() => undefined);
    }
  }, [filters, reloadKey]);

  const loadMore = React.useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const r = await customersService.fetchPage(filters, cursor);
      if (id !== requestId.current) return;
      setItems((prev) => [...prev, ...r.items.filter((x) => !prev.some((p) => p.id === x.id))]);
      setCursor(r.cursor);
      setHasMore(r.hasMore);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [filters, cursor, hasMore, loadingMore]);

  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);

  return { items, loading, loadingMore, hasMore, error, total, loadMore, reload };
}
