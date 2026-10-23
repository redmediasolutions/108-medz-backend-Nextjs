"use client";

import * as React from "react";
import { hashKey, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { Unsubscribe } from "firebase/firestore";

export type Subscribe<T> = (onData: (d: T) => void, onError: (e: Error) => void) => Unsubscribe;

/**
 * Firestore realtime listener → React Query cache.
 * The first snapshot resolves the query (loading / error states, caching, dedupe across components);
 * a live listener then pushes every later snapshot into the cache with setQueryData.
 * Pass `null` to keep the query idle until its inputs are ready.
 */
export function useFirestoreQuery<T>(queryKey: QueryKey, subscribe: Subscribe<T> | null) {
  const qc = useQueryClient();
  const keyHash = hashKey(queryKey);
  const enabled = subscribe !== null;
  const subRef = React.useRef(subscribe);
  subRef.current = subscribe;

  const query = useQuery<T>({
    queryKey,
    enabled,
    staleTime: Infinity, // the live listener keeps it fresh
    queryFn: () =>
      new Promise<T>((resolve, reject) => {
        let done = false;
        const unsub = subRef.current!(
          (d) => {
            if (done) return;
            done = true;
            resolve(d);
            queueMicrotask(() => unsub());
          },
          (e) => {
            if (done) return;
            done = true;
            reject(e);
          }
        );
      }),
  });

  React.useEffect(() => {
    if (!enabled) return;
    return subRef.current!(
      (d) => qc.setQueryData(queryKey, d),
      (e) => console.error("[firestore]", keyHash, e)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyHash, enabled, qc]);

  return query;
}
