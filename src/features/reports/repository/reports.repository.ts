import { Timestamp, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

import { db } from "@/firebase/config";
import { CUSTOMER_COLLECTIONS } from "@/firebase/collections";
import { mapAppOrder } from "@/features/orders/lib/app-order-mapper";
import { ordersRepository } from "@/features/orders/repository/orders.repository";
import type { AppOrder, WooOrder } from "@/features/orders/types";

export const reportsRepository = {
  /** Firebase Orders created in [from, to) — single-field range, no composite index needed. */
  async firebaseBetween(from: Date, to: Date): Promise<AppOrder[]> {
    const snap = await getDocs(
      query(
        collection(db, CUSTOMER_COLLECTIONS.orders),
        where("createdAt", ">=", Timestamp.fromDate(from)),
        where("createdAt", "<", Timestamp.fromDate(to)),
        orderBy("createdAt", "desc"),
        limit(10000)
      )
    );
    return snap.docs.map(mapAppOrder);
  },

  /** Every WooCommerce order created between two dates (yyyy-mm-dd, inclusive). */
  wooBetween: (after: string, before: string, fresh: boolean): Promise<{ orders: WooOrder[]; truncated: boolean }> =>
    ordersRepository.wooAll({ after, before, fresh }),

  /** Firebase twins of Woo orders (by doc id or wooOrderId). */
  firebaseTwins: (wooIds: number[]): Promise<AppOrder[]> => ordersRepository.appByWooIds(wooIds),
};
