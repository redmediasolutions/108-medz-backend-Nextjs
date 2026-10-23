import { NextResponse } from "next/server";

import { mapWooNote, mapWooOrder } from "@/features/orders/lib/woo-mapper";
import { requireAdmin } from "@/lib/server/require-admin";
import { routeError } from "@/lib/server/route-error";
import { WooError, wooGet } from "@/lib/server/woo";

/** GET /api/woo/orders/:id — one order + its order notes. Admin only. 404 → { order: null }. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ order: null, notes: [] });

    try {
      const [order, notes] = await Promise.all([
        wooGet<Record<string, unknown>>(`orders/${id}`),
        wooGet<Record<string, unknown>[]>(`orders/${id}/notes`).catch(() => ({ data: [] })),
      ]);
      return NextResponse.json({
        order: mapWooOrder(order.data),
        notes: Array.isArray(notes.data) ? notes.data.map(mapWooNote) : [],
      });
    } catch (e) {
      if (e instanceof WooError && (e.status === 404 || e.status === 400)) {
        return NextResponse.json({ order: null, notes: [] });
      }
      throw e;
    }
  } catch (e) {
    return routeError(e);
  }
}
