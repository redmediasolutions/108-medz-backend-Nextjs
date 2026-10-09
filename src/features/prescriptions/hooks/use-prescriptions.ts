"use client";

import * as React from "react";

import { prescriptionsService } from "../services/prescriptions.service";
import type { Prescription } from "../types";

/** Realtime list of active (non-archived) prescriptions. */
export function usePrescriptions() {
  const [data, setData] = React.useState<Prescription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    return prescriptionsService.subscribeActive(
      (list) => {
        setData(list);
        setError(null);
        setLoading(false);
      },
      (e) => {
        console.error("[prescriptions] stream error", e);
        setError(e);
        setLoading(false);
      }
    );
  }, []);

  return { data, loading, error };
}

/** Realtime single prescription. `data === null` after loading means not found. */
export function usePrescription(docId: string) {
  const [data, setData] = React.useState<Prescription | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    setLoading(true);
    return prescriptionsService.subscribeById(
      docId,
      (p) => {
        setData(p);
        setError(null);
        setLoading(false);
      },
      (e) => {
        console.error("[prescription] stream error", e);
        setError(e);
        setLoading(false);
      }
    );
  }, [docId]);

  return { data, loading, error };
}
