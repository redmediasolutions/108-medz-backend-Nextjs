"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";

import { searchdataService } from "../services/searchdata.service";
import type { SearchHistory, SearchPreset, Searcher } from "../types";

export function useSearchHistory(preset: SearchPreset) {
  const q = useQuery<SearchHistory>({
    queryKey: qk.searchdata.history(preset),
    queryFn: () => searchdataService.load(preset),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
  return { data: q.data ?? null, loading: q.isPending, fetching: q.isFetching, error: q.error, refresh: () => q.refetch() };
}

/** Name + phone for the user ids on screen (batched, cached). */
export function useSearchers(ids: string[]) {
  const sorted = [...new Set(ids)].sort();
  const q = useQuery<Record<string, Searcher | null>>({
    queryKey: qk.searchdata.users(sorted),
    queryFn: () => searchdataService.users(sorted),
    enabled: sorted.length > 0,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
  return { users: q.data ?? {}, loading: sorted.length > 0 && q.isPending };
}
