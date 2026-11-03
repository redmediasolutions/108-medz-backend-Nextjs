"use client";

import * as React from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/firebase/config";

import { mapInvoice, type Invoice } from "../lib/invoice-mapper";

/** Live invoice for Firestore Orders/{id} (same realtime approach as the order page). */
export function useOrderInvoice(orderId: string) {
  const [state, setState] = React.useState<{ invoice: Invoice | null; loading: boolean; error: string | null }>({
    invoice: null,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    if (!orderId) return;
    setState({ invoice: null, loading: true, error: null });
    return onSnapshot(
      doc(db, "Orders", orderId),
      (snap) =>
        setState(
          snap.exists()
            ? { invoice: mapInvoice(snap.id, snap.data()), loading: false, error: null }
            : { invoice: null, loading: false, error: `Order #${orderId} is not in Firestore, so there is no invoice data for it.` }
        ),
      (e) => setState({ invoice: null, loading: false, error: e.message })
    );
  }, [orderId]);

  return state;
}
