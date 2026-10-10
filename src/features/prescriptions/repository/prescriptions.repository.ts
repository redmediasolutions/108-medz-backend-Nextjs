import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";

import { mapPrescriptionDoc, mapPrescriptionItem } from "../lib/prescription-mapper";
import type { Prescription, PrescriptionCustomer } from "../types";

/**
 * Raw data access for prescriptions — 1:1 with lib/services/firestore.dart (Flutter).
 * No UI concerns here; enrichment/caching lives in the service.
 */
export const prescriptionsRepository = {
  /** Prescription where isArchive == false order by prescriptionUploadedTime desc (realtime). */
  subscribeActive(onData: (list: Prescription[]) => void, onError: (e: Error) => void): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.prescriptions),
      where("isArchive", "==", false),
      orderBy("prescriptionUploadedTime", "desc")
    );
    return onSnapshot(q, (snap) => onData(snap.docs.map(mapPrescriptionDoc)), onError);
  },

  subscribeById(
    docId: string,
    onData: (p: Prescription | null) => void,
    onError: (e: Error) => void
  ): Unsubscribe {
    return onSnapshot(
      doc(db, COLLECTIONS.prescriptions, docId),
      (snap) => onData(snap.exists() ? mapPrescriptionDoc(snap) : null),
      onError
    );
  },

  /** Resolve the UserRef (e.g. "Users/abc123") → name + phone_number. */
  async getCustomer(userPath: string): Promise<PrescriptionCustomer | null> {
    const snap = await getDoc(doc(db, userPath));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { name: (d.name as string) ?? null, phone: (d.phone_number as string) ?? null };
  },

  async addItem(docId: string, item: { productId: number; productName: string }) {
    await updateDoc(doc(db, COLLECTIONS.prescriptions, docId), {
      items: arrayUnion({ productId: item.productId, productName: item.productName, comment: "" }),
    });
  },

  async removeItem(docId: string, productId: number) {
    const ref = doc(db, COLLECTIONS.prescriptions, docId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const items: unknown[] = Array.isArray(snap.data().items) ? snap.data().items : [];
      const next = items.filter((e) => {
        if (typeof e === "number") return e !== productId; // legacy int format
        if (e && typeof e === "object") return (e as { productId?: unknown }).productId !== productId;
        return true;
      });
      tx.update(ref, { items: next });
    });
  },

  async updateItemComment(docId: string, productId: number, comment: string) {
    const ref = doc(db, COLLECTIONS.prescriptions, docId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const items: unknown[] = Array.isArray(snap.data().items) ? snap.data().items : [];
      const next = items.map((e) => {
        const parsed = mapPrescriptionItem(e);
        if (!parsed || parsed.productId !== productId) return e;
        // Legacy ints get upgraded to the object format so the comment can be stored.
        if (typeof e === "number") return { productId: e, productName: parsed.productName, comment };
        return { ...(e as Record<string, unknown>), comment };
      });
      tx.update(ref, { items: next });
    });
  },

  async setReady(docId: string, isReady: boolean) {
    await updateDoc(doc(db, COLLECTIONS.prescriptions, docId), {
      isReady,
      updatedAt: serverTimestamp(),
    });
  },
};
