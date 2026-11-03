import { productsService } from "@/features/products/services/products.service";
import { phoneKey } from "@/lib/format";

import { productPrice } from "../lib/order-pricing";
import type { StaffOrderAddress, UnifiedOrder } from "../types";
import { ordersService } from "./orders.service";

/** A cart line for the New order form, built from an earlier order at today's store price. */
export type RepeatLine = { productId: number; name: string; image: string | null; salt: string; price: number; quantity: number };

export type RepeatResult = {
  lines: RepeatLine[];
  /** items no longer sold (unpublished / no price) — left out, like Swiggy's "item unavailable" */
  unavailable: string[];
  /** items whose price changed since the earlier order */
  priceChanges: { name: string; from: number; to: number }[];
  address: StaffOrderAddress | null;
  phone: string;
};

const DEAD = new Set(["cancelled", "canceled", "failed", "trash", "refunded"]);

/** Orders worth offering for repeat: newest first, real items, not cancelled/failed. */
export function repeatableOrders(orders: UnifiedOrder[]): UnifiedOrder[] {
  return orders.filter((o) => o.items.some((i) => i.productId > 0) && !DEAD.has(o.status.toLowerCase()));
}

export function orderAddress(o: UnifiedOrder): StaffOrderAddress | null {
  const a = o.shippingAddress.address1 ? o.shippingAddress : o.billing;
  if (!a.address1) return null;
  return {
    name: [a.firstName, a.lastName].filter(Boolean).join(" ") || o.customer.name,
    phone: phoneKey(a.phone) || phoneKey(o.customer.phone),
    address1: a.address1,
    address2: a.address2,
    city: a.city,
    state: a.state.trim() || "Kerala",
    postcode: a.postcode.replace(/\s/g, ""),
  };
}

export const repeatOrderService = {
  /** Same items + quantities as `order`, re-priced from the store (by product ID). */
  async build(order: UnifiedOrder): Promise<RepeatResult> {
    const wanted = new Map<number, { name: string; quantity: number; oldPrice: number; image: string }>();
    for (const i of order.items) {
      if (!(i.productId > 0)) continue;
      const prev = wanted.get(i.productId);
      wanted.set(i.productId, {
        name: i.name,
        quantity: (prev?.quantity ?? 0) + Math.max(1, i.quantity),
        oldPrice: i.price,
        image: i.image,
      });
    }

    const found = await Promise.all(
      [...wanted.keys()].map((id) =>
        productsService
          .search(String(id), 1)
          .then((r) => r.find((p) => p.id === id) ?? null)
          .catch(() => null)
      )
    );

    const lines: RepeatLine[] = [];
    const unavailable: string[] = [];
    const priceChanges: RepeatResult["priceChanges"] = [];
    [...wanted].forEach(([id, w], idx) => {
      const p = found[idx];
      const price = p ? productPrice(p) : 0;
      if (!p || price <= 0) {
        unavailable.push(w.name);
        return;
      }
      if (w.oldPrice > 0 && Math.abs(w.oldPrice - price) >= 0.01) priceChanges.push({ name: p.name, from: w.oldPrice, to: price });
      lines.push({ productId: id, name: p.name, image: p.image ?? (w.image || null), salt: p.salt, price, quantity: Math.min(999, w.quantity) });
    });

    return {
      lines,
      unavailable,
      priceChanges,
      address: orderAddress(order),
      phone: phoneKey(order.customer.phone) || phoneKey(order.billing.phone) || phoneKey(order.shippingAddress.phone),
    };
  },

  /** For ?repeat=<order id>: Firestore Orders/{id} first, WooCommerce for older orders. */
  async load(key: string): Promise<UnifiedOrder | null> {
    return (await ordersService.get(key)).order;
  },
};
