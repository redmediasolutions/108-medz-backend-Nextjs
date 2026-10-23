"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebounce } from "@/hooks/use-debounce";
import { qk } from "@/lib/query-keys";

import { productsService } from "../services/products.service";
import { PRODUCTS_PAGE_SIZE, type Product } from "../types";

/**
 * Debounced, paginated product search (20 per page, like Flutter). Results are cached per
 * term + page, so going back a page or re-typing a recent search is instant.
 * Shared by the Products page and the prescriptions "Add medicine" sheet.
 */
export function useProductSearch(query: string, page: number, { minLength = 2, delay = 400 } = {}) {
  const term = useDebounce(query.trim(), delay);
  const enabled = term.length >= minLength;

  const q = useQuery<Product[]>({
    queryKey: qk.products.search(term.toLowerCase(), page),
    queryFn: () => productsService.search(term, page),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const results = enabled ? (q.data ?? []) : [];
  return {
    results,
    /** first load for this term (nothing to show yet) */
    loading: enabled && q.isPending,
    /** a new page / term is loading while previous results stay on screen */
    fetching: enabled && q.isFetching,
    error: q.error ? (q.error as Error).message : null,
    hasNext: results.length === PRODUCTS_PAGE_SIZE,
    term,
    searched: enabled,
    pending: query.trim() !== term,
  };
}
