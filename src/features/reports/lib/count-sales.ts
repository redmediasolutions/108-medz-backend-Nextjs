import type { AppOrder, OrderLineItem, WooOrder } from "@/features/orders/types";

import type { MonthOrders, MonthReport, ProductSales, ReportScope } from "../types";

/**
 * Units sold per product for a month.
 *
 * One order is counted once:
 *  - in Firebase (app / office orders) → Firebase items and quantities are used, even if WooCommerce
 *    also has it (Woo order id == Firebase doc id / wooOrderId)
 *  - only in WooCommerce (phone orders typed in wp-admin, website, old orders) → WooCommerce items
 *
 * Left out: cancelled / failed / refunded orders (if either system says so), and online orders
 * that were never paid. "completed" scope counts only orders marked Completed.
 */
const DEAD = new Set(["cancelled", "canceled", "failed", "refunded", "trash", "checkout-draft", "draft"]);
const PAID = new Set(["captured", "paid", "success", "completed"]);
const OFFLINE = new Set(["cod", "cash", "upi"]);

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function firebaseCounts(o: AppOrder, wooStatus: string | undefined, scope: ReportScope): boolean {
  const st = o.status.toLowerCase();
  const ws = (wooStatus ?? "").toLowerCase();
  if (DEAD.has(st) || DEAD.has(ws)) return false;
  if (scope === "completed") return st === "completed" || ws === "completed";
  if (st === "payment_processing") return false;
  const offline = OFFLINE.has(o.paymentMethod.toLowerCase());
  if (!offline) {
    const paid = PAID.has(o.paymentStatus.toLowerCase()) || ["processing", "completed"].includes(st) || ["processing", "completed"].includes(ws);
    if (!paid) return false;
  }
  return true;
}

function wooCounts(o: WooOrder, scope: ReportScope): boolean {
  const st = o.status.toLowerCase();
  if (scope === "completed") return st === "completed";
  return !DEAD.has(st) && st !== "pending"; // pending = awaiting payment
}

export function countSales(data: MonthOrders, scope: ReportScope): MonthReport {
  const map = new Map<string, ProductSales & { orderKeys: Set<string> }>();
  let ordersFirebase = 0;
  let ordersWoo = 0;
  let excluded = 0;

  const add = (orderKey: string, it: OrderLineItem, revenue: number, from: "firebase" | "woo") => {
    if (!(it.quantity > 0)) return;
    const key = it.productId > 0 ? `p${it.productId}` : `n:${it.name.trim().toLowerCase()}`;
    let row = map.get(key);
    if (!row) {
      row = { key, productId: it.productId, name: it.name, units: 0, orders: 0, revenue: 0, unitsFirebase: 0, unitsWoo: 0, orderKeys: new Set() };
      map.set(key, row);
    }
    row.units += it.quantity;
    row.revenue += revenue;
    if (from === "firebase") row.unitsFirebase += it.quantity;
    else row.unitsWoo += it.quantity;
    row.orderKeys.add(orderKey);
  };

  // 1) Firebase orders — always win
  for (const o of data.firebase) {
    const wooId = o.wooOrderId ? String(o.wooOrderId) : /^\d+$/.test(o.id) ? o.id : "";
    if (!firebaseCounts(o, wooId ? data.wooStatusById[wooId] : undefined, scope)) {
      excluded++;
      continue;
    }
    ordersFirebase++;
    for (const it of o.items) add(`fb:${o.id}`, it, it.total || it.price * it.quantity, "firebase");
  }

  // 2) WooCommerce-only orders
  const twin = new Set(data.wooIdsWithTwin);
  for (const o of data.woo) {
    if (twin.has(String(o.id))) continue; // already counted from Firebase (or excluded there)
    if (!wooCounts(o, scope)) {
      excluded++;
      continue;
    }
    ordersWoo++;
    for (const it of o.items) add(`woo:${o.id}`, it, it.total || it.price * it.quantity, "woo");
  }

  const products = [...map.values()]
    .map(({ orderKeys, ...r }) => ({ ...r, orders: orderKeys.size, revenue: round2(r.revenue) }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue);

  return {
    products,
    units: products.reduce((t, p) => t + p.units, 0),
    revenue: round2(products.reduce((t, p) => t + p.revenue, 0)),
    ordersFirebase,
    ordersWoo,
    excluded,
  };
}
