"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";

import { customersService } from "../services/customers.service";
import type { CustomerFilters } from "../types";

export const EMPTY_FILTERS: CustomerFilters = { phone: "", from: "", to: "" };

/** One numbered page of Users (server-side), plus the total count for the filters. */
export function useCustomers(filters: CustomerFilters, page: number, pageSize: number) {
  const list = useQuery({
    queryKey: qk.customers.page(filters, page, pageSize),
    queryFn: () => customersService.fetchPageAt(filters, page, pageSize),
    placeholderData: keepPreviousData,
  });
  const count = useQuery({
    queryKey: qk.customers.count(filters.from, filters.to),
    queryFn: () => customersService.count(filters),
    enabled: !filters.phone.trim(),
    staleTime: 5 * 60_000,
  });

  const phoneSearch = Boolean(filters.phone.trim());
  return {
    items: list.data?.items ?? [],
    hasNext: list.data?.hasMore ?? false,
    loading: list.isPending,
    fetching: list.isFetching,
    error: list.error,
    /** null while counting or for phone search */
    total: phoneSearch ? (list.data?.items.length ?? null) : (count.data ?? null),
  };
}
