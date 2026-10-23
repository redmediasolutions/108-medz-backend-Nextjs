import { NextResponse } from "next/server";

import { mapWooOrder } from "@/features/orders/lib/woo-mapper";
import type { WooOrder } from "@/features/orders/types";
import { requireAdmin } from "@/lib/server/require-admin";
import { routeError } from "@/lib/server/route-error";
import { wooGet } from "@/lib/server/woo";

/**
 * GET /api/woo/orders/all?after=yyyy-mm-dd&before=yyyy-mm-dd — admin only.
 * Every Woo order in the range (100 per page, fetched in parallel), slimmed with `_fields`.
 * Used for pincode / area analytics. Cached for 5 minutes per range.
 */
const PER_PAGE = 100;
const MAX_PAGES = 60; // 6,000 orders
const PARALLEL = 5;
const TTL = 5 * 60 * 1000;

const FIELDS = [
  "id",
  "number",
  "status",
  "created_via",
  "currency",
  "date_created",
  "date_created_gmt",
  "date_paid",
  "date_paid_gmt",
  "total",
  "total_tax",
  "shipping_total",
  "discount_total",
  "customer_id",
  "payment_method",
  "payment_method_title",
  "transaction_id",
  "billing",
  "shipping",
  "line_items",
  "fee_lines",
  "refunds",
].join(",");

const cache = new Map<string, { at: number; orders: WooOrder[]; truncated: boolean }>();

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const q = new URL(req.url).searchParams;
    const after = q.get("after") ?? "";
    const before = q.get("before") ?? "";
    const key = `${after}|${before}`;
    const fresh = q.get("fresh") === "1";

    const hit = cache.get(key);
    if (hit && !fresh && Date.now() - hit.at < TTL) {
      return NextResponse.json({ orders: hit.orders, truncated: hit.truncated, cachedAt: hit.at });
    }

    const params = (page: number) => ({
      page,
      per_page: PER_PAGE,
      status: "any",
      orderby: "date",
      order: "desc",
      after: after ? `${after}T00:00:00` : undefined,
      before: before ? `${before}T23:59:59` : undefined,
      _fields: FIELDS,
    });

    const first = await wooGet<Record<string, unknown>[]>("orders", params(1));
    const pages = Math.min(first.totalPages || 1, MAX_PAGES);
    const raw: Record<string, unknown>[] = [...(first.data ?? [])];

    for (let start = 2; start <= pages; start += PARALLEL) {
      const batch = Array.from({ length: Math.min(PARALLEL, pages - start + 1) }, (_, i) => start + i);
      const results = await Promise.all(batch.map((p) => wooGet<Record<string, unknown>[]>("orders", params(p))));
      for (const r of results) raw.push(...(r.data ?? []));
    }

    const orders = raw.map(mapWooOrder);
    const truncated = (first.totalPages || 1) > MAX_PAGES;
    if (cache.size > 20) cache.clear();
    cache.set(key, { at: Date.now(), orders, truncated });
    return NextResponse.json({ orders, truncated, cachedAt: Date.now() });
  } catch (e) {
    return routeError(e);
  }
}
