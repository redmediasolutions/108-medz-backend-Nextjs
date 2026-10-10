import type { Unsubscribe } from "firebase/firestore";

import { prescriptionsRepository as repo } from "../repository/prescriptions.repository";
import type { Prescription, PrescriptionCustomer, ProductSearchResult } from "../types";

/**
 * Customer lookups are cached for the whole session (Flutter cached per snapshot only),
 * so realtime updates don't re-read every Users doc.
 */
const customerCache = new Map<string, Promise<PrescriptionCustomer | null>>();

function getCustomerCached(path: string) {
  let hit = customerCache.get(path);
  if (!hit) {
    hit = repo.getCustomer(path).catch(() => {
      customerCache.delete(path);
      return null;
    });
    customerCache.set(path, hit);
  }
  return hit;
}

async function withCustomer(p: Prescription): Promise<Prescription> {
  if (!p.userRefPath) return p;
  const c = await getCustomerCached(p.userRefPath);
  if (!c) return p;
  return { ...p, customerName: c.name ?? p.customerName, customerMobile: c.phone ?? p.customerMobile };
}

export const prescriptionsService = {
  subscribeActive(onData: (list: Prescription[]) => void, onError: (e: Error) => void): Unsubscribe {
    let version = 0;
    return repo.subscribeActive(async (list) => {
      const v = ++version;
      const enriched = await Promise.all(list.map(withCustomer));
      if (v === version) onData(enriched); // drop stale snapshots
    }, onError);
  },

  subscribeById(
    docId: string,
    onData: (p: Prescription | null) => void,
    onError: (e: Error) => void
  ): Unsubscribe {
    let version = 0;
    return repo.subscribeById(
      docId,
      async (p) => {
        const v = ++version;
        const enriched = p ? await withCustomer(p) : null;
        if (v === version) onData(enriched);
      },
      onError
    );
  },

  async addMedicine(prescription: Prescription, product: ProductSearchResult) {
    if (prescription.items.some((i) => i.productId === product.id)) {
      throw new Error(`${product.name} is already on this prescription`);
    }
    await repo.addItem(prescription.docId, { productId: product.id, productName: product.name });
  },

  removeMedicine: (docId: string, productId: number) => repo.removeItem(docId, productId),

  updateComment: (docId: string, productId: number, comment: string) =>
    repo.updateItemComment(docId, productId, comment.trim()),

  setReady: (docId: string, isReady: boolean) => repo.setReady(docId, isReady),
};
