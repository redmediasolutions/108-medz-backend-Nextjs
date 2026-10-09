"use client";

import * as React from "react";

import { useDebounce } from "@/hooks/use-debounce";

import { prescriptionsService } from "../services/prescriptions.service";
import type { ProductSearchResult } from "../types";

/** Debounced product search with "load more" paging (20 per page, like Flutter). */
export function useProductSearch(query: string) {
  const debounced = useDebounce(query.trim(), 400);
  const [results, setResults] = React.useState<ProductSearchResult[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setHasMore(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);
    prescriptionsService
      .searchProducts(debounced, 1)
      .then((r) => {
        if (cancelled) return;
        setResults(r);
        setHasMore(r.length === 20);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const loadMore = React.useCallback(async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const r = await prescriptionsService.searchProducts(debounced, nextPage);
      setResults((prev) => [...prev, ...r.filter((x) => !prev.some((p) => p.id === x.id))]);
      setHasMore(r.length === 20);
      setPage(nextPage);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [debounced, page]);

  return { results, loading, error, hasMore, loadMore, searched: debounced.length >= 2 };
}
