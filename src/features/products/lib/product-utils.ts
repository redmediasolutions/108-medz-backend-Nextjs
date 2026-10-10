import type { Product } from "../types";

/** Selling price: sale price if set, else price, else regular price. */
export function sellingPrice(p: Product): number {
  for (const v of [p.salePrice, p.price, p.regularPrice]) {
    const n = Number(v);
    if (v && !Number.isNaN(n) && n > 0) return n;
  }
  return 0;
}

export function mrp(p: Product): number {
  const n = Number(p.regularPrice);
  return Number.isNaN(n) ? 0 : n;
}

/** Whole-number discount % off MRP, or null when there is none. */
export function discountPercent(p: Product): number | null {
  const m = mrp(p);
  const s = sellingPrice(p);
  if (!m || !s || s >= m) return null;
  return Math.round(((m - s) / m) * 100);
}
