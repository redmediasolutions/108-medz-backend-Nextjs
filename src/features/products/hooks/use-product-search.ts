"use client";

import * as React from "react";

import { useDebounce } from "@/hooks/use-debounce";

import { productsService } from "../services/products.service";
import { PRODUCTS_PAGE_SIZE, type Product } from "../types";

/**
 * Debounced product search with paging (20 per page, like Flutter).
 * Shared by the Products page and the prescriptions "Add medicine" sheet.
 */
export function useProductSearch(query: string, { minLength = 2, delay = 400 } = {}) {
  const debounced = useDebounce(query.trim(), delay);
  const [results, setResults] = React.useState<Product[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const loadingMoreRef = React.useRef(false);

  React.useEffect(() => {
    if (debounced.length < minLength) {
      setResults([]);
      setHasMore(false);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);
    productsService
      .search(debounced, 1)
      .then((r) => {
        if (cancelled) return;
        setResults(r);
        setHasMore(r.length === PRODUCTS_PAGE_SIZE);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, minLength]);

  const loadMore = React.useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const r = await productsService.search(debounced, nextPage);
      setResults((prev) => [...prev, ...r.filter((x) => !prev.some((p) => p.id === x.id))]);
      setHasMore(r.length === PRODUCTS_PAGE_SIZE);
      setPage(nextPage);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [debounced, page, hasMore, loading]);

  return {
    results,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    /** the query actually searched */
    term: debounced,
    searched: debounced.length >= minLength,
    pending: query.trim() !== debounced,
  };
}
