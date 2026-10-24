import { mergeOrderLists } from "@/features/orders/lib/merge-orders";
import type { AppOrder, UnifiedOrder } from "@/features/orders/types";

import { aggregateByPincode, rangeStart, toInputDate } from "../lib/aggregate";
import { clusterPeople, clustersForOrders } from "../lib/cluster";
import { orderPincode, phoneKeys } from "../lib/normalize";
import { pincodesRepository as repo } from "../repository/pincodes.repository";
import type { PersonCluster, PincodeStat, RangePreset } from "../types";

export type AreaData = {
  preset: RangePreset;
  orders: UnifiedOrder[];
  clusters: PersonCluster[];
  stats: PincodeStat[];
  /** more than 6,000 Woo orders in range — oldest were skipped */
  truncated: boolean;
  appError: string | null;
  loadedAt: number;
};

async function build(preset: RangePreset, fresh: boolean): Promise<AreaData> {
  const from = rangeStart(preset);
  const [woo, app] = await Promise.all([
    repo.wooInRange(from ? toInputDate(from) : undefined, fresh),
    repo.appSince(from).then(
      (a) => ({ orders: a, error: null as string | null }),
      (e: Error) => ({ orders: [] as AppOrder[], error: e.message })
    ),
  ]);
  const orders = mergeOrderLists(woo.orders, app.orders);
  const clusters = clusterPeople(orders);
  return {
    preset,
    orders,
    clusters,
    stats: aggregateByPincode(orders, clusters),
    truncated: woo.truncated,
    appError: app.error,
    loadedAt: Date.now(),
  };
}

export type LinkedIdentity = {
  kind: "phone" | "account" | "name" | "email";
  value: string;
  orders: number;
};

export const pincodesService = {
  /** All orders in the range, merged, clustered into people and grouped by pincode. (Cached by React Query.) */
  load(preset: RangePreset, { fresh = false } = {}): Promise<AreaData> {
    return build(preset, fresh);
  },

  /**
   * "Also orders as": for one customer's orders, pull every order shipped to the same pincodes
   * (up to 3), cluster them, and return the identities (phones / names / app accounts) that
   * ended up in the same person-cluster.
   */
  async linkedIdentities(mine: UnifiedOrder[]) {
    const pinCounts = new Map<string, number>();
    mine.forEach((o) => {
      const p = orderPincode(o);
      if (p) pinCounts.set(p, (pinCounts.get(p) ?? 0) + 1);
    });
    const pins = [...pinCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p);
    if (!pins.length) return { cluster: null as PersonCluster | null, others: [] as LinkedIdentity[], pins };

    const results = await Promise.all(
      pins.map(async (pin) => {
        const [woo, app] = await Promise.all([
          repo.wooSearch(pin).then((r) => r.orders).catch(() => []),
          repo.appByPincode(pin).catch(() => [] as AppOrder[]),
        ]);
        return mergeOrderLists(woo, app);
      })
    );
    const byKey = new Map<string, UnifiedOrder>();
    [...mine, ...results.flat()].forEach((o) => byKey.set(o.key, o));
    const clusters = clusterPeople([...byKey.values()]);
    const myKeys = new Set(mine.map((o) => o.key));
    const mineClusters = clustersForOrders(clusters, myKeys);
    if (!mineClusters.length) return { cluster: null, others: [], pins };

    // If the customer's own orders landed in several clusters, report the biggest
    const cluster = mineClusters.sort((a, b) => b.orderCount - a.orderCount)[0];
    const myPhones = new Set(mine.flatMap((o) => [o.customer.phone, o.billing.phone, o.shippingAddress.phone].flatMap(phoneKeys)));
    const myUids = new Set(mine.map((o) => o.customer.uid).filter(Boolean));
    const myNames = new Set(mine.map((o) => o.customer.name.toLowerCase()));
    const myEmails = new Set(mine.map((o) => o.customer.email.toLowerCase()).filter(Boolean));
    const countBy = (pred: (o: UnifiedOrder) => boolean) => cluster.orders.filter(pred).length;

    const others: LinkedIdentity[] = [
      ...cluster.phones
        .filter((p) => !myPhones.has(p))
        .map((p) => ({ kind: "phone" as const, value: p, orders: countBy((o) => [o.customer.phone, o.shippingAddress.phone].flatMap(phoneKeys).includes(p)) })),
      ...cluster.accounts
        .filter((u) => !myUids.has(u))
        .map((u) => ({ kind: "account" as const, value: u, orders: countBy((o) => o.customer.uid === u) })),
      ...cluster.emails
        .filter((e) => !myEmails.has(e))
        .map((e) => ({ kind: "email" as const, value: e, orders: countBy((o) => o.customer.email.toLowerCase() === e) })),
      ...cluster.names
        .filter((n) => !myNames.has(n.toLowerCase()))
        .map((n) => ({ kind: "name" as const, value: n, orders: countBy((o) => o.customer.name === n) })),
    ];
    return { cluster, others, pins };
  },
};
