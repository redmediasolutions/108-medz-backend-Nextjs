"use client";

import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { qk } from "@/lib/query-keys";

import { prescriptionsService } from "../services/prescriptions.service";
import type { Prescription } from "../types";

/** Realtime list of active (non-archived) prescriptions. */
export function usePrescriptions() {
  const q = useFirestoreQuery<Prescription[]>(qk.prescriptions.active(), prescriptionsService.subscribeActive);
  return { data: q.data ?? [], loading: q.isPending, error: q.error };
}

/** Realtime single prescription. `data === null` after loading means not found. */
export function usePrescription(docId: string) {
  const q = useFirestoreQuery<Prescription | null>(qk.prescriptions.detail(docId), (ok, err) =>
    prescriptionsService.subscribeById(docId, ok, err)
  );
  return { data: q.data ?? null, loading: q.isPending, error: q.error };
}

/** Realtime prescriptions for one customer (Users/{id}). */
export function useUserPrescriptions(userId: string | undefined) {
  const q = useFirestoreQuery<Prescription[]>(
    qk.prescriptions.byUser(userId ?? ""),
    userId ? (ok, err) => prescriptionsService.subscribeByUser(userId, ok, err) : null
  );
  return { data: q.data ?? [], loading: q.isPending, error: q.error };
}
