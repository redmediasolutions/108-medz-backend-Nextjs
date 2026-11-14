"use client";

import * as React from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";

import { countSales } from "../lib/count-sales";
import { reportsService } from "../services/reports.service";
import type { MonthKey, ReportScope } from "../types";

/** Products sold in a month (Firebase first, WooCommerce-only orders added; each order once). */
export function useMonthSales(month: MonthKey, scope: ReportScope) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: qk.reports.month(month),
    queryFn: () => reportsService.loadMonth(month),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
  const report = React.useMemo(() => (q.data ? countSales(q.data, scope) : null), [q.data, scope]);
  return {
    report,
    data: q.data ?? null,
    loading: q.isPending,
    fetching: q.isFetching,
    error: q.error as Error | null,
    refresh: () => qc.fetchQuery({ queryKey: qk.reports.month(month), queryFn: () => reportsService.loadMonth(month, true) }),
  };
}
