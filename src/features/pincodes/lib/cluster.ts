import type { UnifiedOrder } from "@/features/orders/types";

import type { LinkReason, PersonCluster } from "../types";
import {
  addressKey,
  addressTokens,
  displayAddress,
  jaccard,
  normName,
  numberTokens,
  orderAddress,
  orderPincode,
  phoneKey,
} from "./normalize";

/** Thresholds — tuned to prefer missing a link over merging two different families. */
export const SIMILAR_ADDRESS = 0.75;
export const NAME_NEARBY_ADDRESS = 0.4;
/** a street name alone ("Car Street") is not enough — need e.g. house no. + landmark */
export const MIN_SHARED_TOKENS = 2;

const DEAD = new Set(["cancelled", "canceled", "failed", "refunded"]);

class UnionFind {
  parent: number[];
  reasons = new Map<number, Set<LinkReason>>();
  /** phones / accounts / emails held by each group — a reason is kept only when it joins different identities */
  ids = new Map<number, Set<string>>();
  constructor(n: number, ids: Set<string>[]) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    ids.forEach((s, i) => this.ids.set(i, s));
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number, reason: LinkReason) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const ia = this.ids.get(ra) ?? new Set<string>();
    const ib = this.ids.get(rb) ?? new Set<string>();
    const subset = (x: Set<string>, y: Set<string>) => [...x].every((v) => y.has(v));
    const joinsNewIdentity = !subset(ia, ib) && !subset(ib, ia);
    const set = new Set([...(this.reasons.get(ra) ?? []), ...(this.reasons.get(rb) ?? [])]);
    if (joinsNewIdentity) set.add(reason);
    this.parent[rb] = ra;
    this.reasons.delete(rb);
    this.reasons.set(ra, set);
    this.ids.set(ra, new Set([...ia, ...ib]));
    this.ids.delete(rb);
  }
}

function countSorted(values: string[]) {
  const m = new Map<string, number>();
  values.filter(Boolean).forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

/**
 * Group orders into people/households.
 *  1. Strong links (global): same phone · same email · same app account · same address in the same pincode.
 *  2. Fuzzy links (within a pincode only): very similar address, or same name + overlapping address.
 * A link is only ever made inside one pincode for address-based reasons, so two people with the same
 * name in different areas are never merged.
 */
export function clusterPeople(orders: UnifiedOrder[]): PersonCluster[] {
  const firstSeen = new Map<string, number>();
  const link = (key: string, i: number, reason: LinkReason) => {
    const j = firstSeen.get(key);
    if (j === undefined) firstSeen.set(key, i);
    else uf.union(j, i, reason);
  };

  const meta = orders.map((o) => {
    const pin = orderPincode(o);
    const addr = orderAddress(o);
    return {
      pin,
      tokens: addressTokens(addr),
      addrKey: addressKey(addr),
      name: normName(o.customer.name),
      phones: [o.customer.phone, o.billing.phone, o.shippingAddress.phone].map(phoneKey).filter((p) => p.length === 10),
    };
  });

  const uf = new UnionFind(
    orders.length,
    orders.map((o, i) => {
      const ids = new Set(meta[i].phones.map((p) => `phone:${p}`));
      if (o.customer.uid) ids.add(`uid:${o.customer.uid}`);
      if (o.customer.email) ids.add(`email:${o.customer.email.trim().toLowerCase()}`);
      return ids;
    })
  );

  orders.forEach((o, i) => {
    const m = meta[i];
    new Set(m.phones).forEach((p) => link(`phone:${p}`, i, "same-phone"));
    if (o.customer.email) link(`email:${o.customer.email.trim().toLowerCase()}`, i, "same-email");
    if (o.customer.uid) link(`uid:${o.customer.uid}`, i, "same-account");
    if (m.pin && m.addrKey) link(`addr:${m.pin}:${m.addrKey}`, i, "same-address");
  });

  // Fuzzy pass, per pincode, comparing one representative order per current group
  const byPin = new Map<string, number[]>();
  meta.forEach((m, i) => m.pin && byPin.set(m.pin, [...(byPin.get(m.pin) ?? []), i]));
  for (const idx of byPin.values()) {
    for (let a = 0; a < idx.length; a++) {
      for (let b = a + 1; b < idx.length; b++) {
        const i = idx[a];
        const j = idx[b];
        if (uf.find(i) === uf.find(j)) continue;
        const shared = [...meta[i].tokens].filter((t) => meta[j].tokens.has(t)).length;
        if (shared < 1) continue;
        // Different house / flat numbers → different homes, however similar the rest (apartment blocks)
        const ni = numberTokens(meta[i].tokens);
        const nj = numberTokens(meta[j].tokens);
        if (ni.size && nj.size && ![...ni].some((n) => nj.has(n))) continue;
        const sim = jaccard(meta[i].tokens, meta[j].tokens);
        if (sim >= SIMILAR_ADDRESS && shared >= MIN_SHARED_TOKENS) uf.union(i, j, "similar-address");
        else if (meta[i].name && meta[i].name === meta[j].name && sim >= NAME_NEARBY_ADDRESS) uf.union(i, j, "same-name-nearby");
      }
    }
  }

  const groups = new Map<number, number[]>();
  orders.forEach((_, i) => {
    const r = uf.find(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  });

  const clusters: PersonCluster[] = [];
  for (const [root, idx] of groups) {
    const list = idx.map((i) => orders[i]).sort((x, y) => (y.createdAt?.getTime() ?? 0) - (x.createdAt?.getTime() ?? 0));
    const phones = countSorted(idx.flatMap((i) => meta[i].phones));
    const accounts = countSorted(list.map((o) => o.customer.uid ?? ""));
    const live = list.filter((o) => !DEAD.has(o.status.toLowerCase()) && !["failed", "cancelled", "refunded"].includes(o.payment.state));
    const reasons = [...(uf.reasons.get(root) ?? [])];
    clusters.push({
      id: `p${root}-${list[0]?.key ?? ""}`,
      names: countSorted(list.map((o) => o.customer.name).filter((n) => n && n !== "Unknown")),
      phones,
      emails: countSorted(list.map((o) => o.customer.email.toLowerCase())),
      accounts,
      pincodes: countSorted(idx.map((i) => meta[i].pin ?? "")),
      addresses: countSorted(list.map((o) => displayAddress(orderAddress(o)))),
      reasons,
      orders: list,
      orderCount: list.length,
      spend: live.reduce((s, o) => s + o.total, 0),
      firstOrderAt: list.at(-1)?.createdAt ?? null,
      lastOrderAt: list[0]?.createdAt ?? null,
      bySource: list.reduce((acc, o) => ((acc[o.source] += 1), acc), { app: 0, phone: 0, website: 0, other: 0 }),
      multiIdentity: phones.length > 1 || accounts.length > 1,
    });
  }
  return clusters.sort((a, b) => b.orderCount - a.orderCount || (b.lastOrderAt?.getTime() ?? 0) - (a.lastOrderAt?.getTime() ?? 0));
}

/** The cluster(s) containing any of these order keys. */
export function clustersForOrders(clusters: PersonCluster[], keys: Set<string>) {
  return clusters.filter((c) => c.orders.some((o) => keys.has(o.key)));
}
