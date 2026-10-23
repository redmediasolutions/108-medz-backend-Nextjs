"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";

import { pincodesService } from "../services/pincodes.service";
import type { RangePreset } from "../types";

/** Orders + people + pincode stats for a range. Shared between /pincodes and /pincodes/[pin] via the query cache. */
export function useAreaData(preset: RangePreset) {
  const fresh = React.useRef(false);
  const q = useQuery({
    queryKey: qk.areas.data(preset),
    queryFn: () => {
      const bypass = fresh.current; // Refresh button also skips the server's 5-min Woo cache
      fresh.current = false;
      return pincodesService.load(preset, { fresh: bypass });
    },
    staleTime: 5 * 60_000,
  });
  return {
    data: q.data ?? null,
    loading: q.isFetching,
    error: q.error,
    refresh: () => {
      fresh.current = true;
      void q.refetch();
    },
  };
}
