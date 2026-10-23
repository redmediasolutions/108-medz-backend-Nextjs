"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type { UnifiedOrder } from "@/features/orders/types";
import { qk } from "@/lib/query-keys";

import { pincodesService } from "../services/pincodes.service";

/** Other phones / accounts / names that look like the same person, based on shared pincode + address. */
export function useLinkedIdentities(orders: UnifiedOrder[], ready: boolean) {
  const sig = React.useMemo(() => orders.map((o) => o.key).sort().join(","), [orders]);
  const q = useQuery({
    queryKey: qk.areas.linked(sig),
    queryFn: () => pincodesService.linkedIdentities(orders),
    enabled: ready && orders.length > 0,
    staleTime: 5 * 60_000,
  });
  return {
    loading: ready && orders.length > 0 && q.isPending,
    cluster: q.data?.cluster ?? null,
    others: q.data?.others ?? [],
    pins: q.data?.pins ?? [],
  };
}
