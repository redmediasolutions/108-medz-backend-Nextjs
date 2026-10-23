import { NextResponse } from "next/server";

import { mapWooOrder } from "@/features/orders/lib/woo-mapper";
import { requireAdmin } from "@/lib/server/require-admin";
import { routeError } from "@/lib/server/route-error";
import { wooGet } from "@/lib/server/woo";

const STATUSES = new Set([
  "any",
  "pending",
  "processing",
  "on-hold",
  "completed",
  "cancelled",
  "refunded",
  "failed",
  "checkout-draft",
]);

/**
 * GET /api/woo/orders — admin only.
 * ?page ?per_page ?status ?search ?after ?before (yyyy-mm-dd) ?include=1,2,3 ?created_via=admin|checkout|rest-api
 */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const q = new URL(req.url).searchParams;

    const perPage = Math.min(100, Math.max(1, Number(q.get("per_page") ?? 25)));
    const status = q.get("status") ?? "any";
    const createdVia = q.get("created_via") ?? "";
    const include = (q.get("include") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => /^\d+$/.test(x));
    const after = q.get("after");
    const before = q.get("before");

    const { data, total, totalPages } = await wooGet<Record<string, unknown>[]>("orders", {
      page: Math.max(1, Number(q.get("page") ?? 1)),
      per_page: include.length ? Math.max(perPage, include.length) : perPage,
      status: STATUSES.has(status) ? status : "any",
      search: q.get("search")?.trim() || undefined,
      include: include.length ? include.join(",") : undefined,
      after: after ? `${after}T00:00:00` : undefined,
      before: before ? `${before}T23:59:59` : undefined,
      created_via: createdVia || undefined,
      orderby: "date",
      order: "desc",
    });

    let orders = Array.isArray(data) ? data.map(mapWooOrder) : [];
    // Older WooCommerce versions ignore `created_via`; enforce it here too.
    if (createdVia) orders = orders.filter((o) => o.createdVia === createdVia);

    return NextResponse.json({ orders, total, totalPages });
  } catch (e) {
    return routeError(e);
  }
}
