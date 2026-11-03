// features/orders/hooks/use-live-order-payment.ts
import * as React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";

export type LivePaymentData = {
  paymentStatus?: "captured" | "pending" | "failed";
  status?: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  paymentLinkStatus?: "created" | "paid" | "expired" | "cancelled";
  razorpayPaymentId?: string;
  paidAt?: any;
  finalized?: boolean;
};

export function useLiveOrderPayment(orderId: string | number | null | undefined) {
  const [liveData, setLiveData] = React.useState<LivePaymentData | null>(null);

  React.useEffect(() => {
    if (!orderId) return;

    const docRef = doc(db, "Orders", String(orderId));
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLiveData({
            paymentStatus: data.paymentStatus,
            status: data.status,
            paymentLinkId: data.paymentLinkId,
            paymentLinkUrl: data.paymentLinkUrl,
            paymentLinkStatus: data.paymentLinkStatus,
            razorpayPaymentId: data.razorpayPaymentId,
            paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : data.paidAt,
            finalized: data.finalized,
          });
        }
      },
      (err) => {
        console.error("Firestore onSnapshot payment tracking error:", err);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  return liveData;
}