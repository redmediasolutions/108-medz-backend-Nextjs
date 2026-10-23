"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export type PageState = {
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
};

/** Page + page size in component state. Resets to page 1 whenever `resetKey` changes (e.g. filters). */
export function usePageState(defaultSize = 20, resetKey?: unknown): PageState {
  const [page, setPage] = React.useState(1);
  const [pageSize, setSize] = React.useState(defaultSize);
  const key = JSON.stringify(resetKey ?? null);
  React.useEffect(() => setPage(1), [key]);
  return {
    page,
    pageSize,
    setPage,
    setPageSize: (s) => {
      setSize(s);
      setPage(1);
    },
  };
}

/** Page + page size kept in the URL (?page=&size=) so they survive reload and back/forward. */
export function useUrlPageState(defaultSize = 20, prefix = ""): PageState {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const pKey = `${prefix}page`;
  const sKey = `${prefix}size`;
  const page = Math.max(1, Number(sp.get(pKey)) || 1);
  const sizeParam = Number(sp.get(sKey));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeParam) ? sizeParam : defaultSize;

  const write = React.useCallback(
    (next: Record<string, number | null>) => {
      const q = new URLSearchParams(sp);
      for (const [k, v] of Object.entries(next)) {
        if (v === null) q.delete(k);
        else q.set(k, String(v));
      }
      router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
    },
    [sp, router, pathname]
  );

  return {
    page,
    pageSize,
    setPage: (p) => write({ [pKey]: p > 1 ? p : null }),
    setPageSize: (s) => write({ [sKey]: s === defaultSize ? null : s, [pKey]: null }),
  };
}

/** Client-side slice of an already-loaded list. Clamps the page if the list shrank. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, pageCount, page: current };
}
