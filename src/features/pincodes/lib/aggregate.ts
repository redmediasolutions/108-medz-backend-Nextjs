import type { UnifiedOrder } from "@/features/orders/types";

import type { PersonCluster, PincodeStat, ProductCount } from "../types";
import { UNKNOWN_PINCODE } from "../types";
import { orderAddress, orderPincode } from "./normalize";

const DEAD = new Set(["cancelled", "canceled", "failed", "refunded"]);

function mostCommon(values: string[]) {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = v.trim();
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  let best = "";
  let n = 0;
  for (const [k, c] of m) if (c > n) [best, n] = [k, c];
  return best;
}

export function topProducts(orders: UnifiedOrder[], limit = 5): ProductCount[] {
  const m = new Map<string, ProductCount>();
  for (const o of orders) {
    for (const i of o.items) {
      const key = i.productId ? `id:${i.productId}` : `name:${i.name.toLowerCase()}`;
      const cur = m.get(key) ?? { productId: i.productId, name: i.name, quantity: 0, orders: 0 };
      cur.quantity += i.quantity;
      cur.orders += 1;
      m.set(key, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.orders - a.orders || b.quantity - a.quantity).slice(0, limit);
}

/** Per-pincode stats. People are counted from the global clusters so one person = one count. */
export function aggregateByPincode(orders: UnifiedOrder[], clusters: PersonCluster[]): PincodeStat[] {
  const clusterOf = new Map<string, PersonCluster>();
  clusters.forEach((c) => c.orders.forEach((o) => clusterOf.set(o.key, c)));

  const groups = new Map<string, UnifiedOrder[]>();
  for (const o of orders) {
    const pin = orderPincode(o) ?? UNKNOWN_PINCODE;
    groups.set(pin, [...(groups.get(pin) ?? []), o]);
  }

  const stats: PincodeStat[] = [];
  for (const [pincode, list] of groups) {
    const live = list.filter((o) => !DEAD.has(o.status.toLowerCase()) && !["failed", "cancelled", "refunded"].includes(o.payment.state));
    const revenue = live.reduce((s, o) => s + o.total, 0);
    const people = new Set(list.map((o) => clusterOf.get(o.key)?.id ?? o.key));
    const multi = new Set(list.map((o) => clusterOf.get(o.key)).filter((c) => c?.multiIdentity).map((c) => c!.id));
    const dates = list.map((o) => o.createdAt?.getTime() ?? 0).filter(Boolean);
    stats.push({
      pincode,
      city: mostCommon(list.map((o) => orderAddress(o).city)),
      state: mostCommon(list.map((o) => orderAddress(o).state)),
      orders: list.length,
      revenue,
      avgOrder: live.length ? revenue / live.length : 0,
      cancelled: list.length - live.length,
      people: people.size,
      multiIdentityPeople: multi.size,
      bySource: list.reduce((acc, o) => ((acc[o.source] += 1), acc), { app: 0, phone: 0, website: 0, other: 0 }),
      firstOrderAt: dates.length ? new Date(Math.min(...dates)) : null,
      lastOrderAt: dates.length ? new Date(Math.max(...dates)) : null,
      topProducts: topProducts(list, 3),
    });
  }
  return stats.sort((a, b) => b.orders - a.orders);
}

export function rangeStart(preset: "30d" | "90d" | "12m" | "all"): Date | null {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (preset === "30d") d.setDate(d.getDate() - 30);
  else if (preset === "90d") d.setDate(d.getDate() - 90);
  else if (preset === "12m") d.setFullYear(d.getFullYear() - 1);
  else return null;
  return d;
}

export function toInputDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
