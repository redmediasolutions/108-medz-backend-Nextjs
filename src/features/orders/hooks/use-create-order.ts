"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";

import { ordersService } from "../services/orders.service";
import type { StaffOrderInput, StaffOrderResult } from "../types";

/** Places an office order via the backendOrders Cloud Function; refreshes orders and queries. */
export function useCreateStaffOrder() {
  const qc = useQueryClient();
  return useMutation<StaffOrderResult, Error, StaffOrderInput>({
    mutationFn: (input: StaffOrderInput) => ordersService.createStaffOrder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.orders.all });
      qc.invalidateQueries({ queryKey: qk.areas.data("").slice(0, 1) });
    },
  });
}