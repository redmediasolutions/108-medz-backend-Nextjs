import { NextResponse } from "next/server";

import { mapWooNote, mapWooOrder } from "@/features/orders/lib/woo-mapper";
import { requireAdmin } from "@/lib/server/require-admin";
import { routeError } from "@/lib/server/route-error";
import { WooError, wooGet, wooSend } from "@/lib/server/woo";

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
      const raw = order.data as Record<string, unknown>;
      const wantLines = new URL(req.url).searchParams.get("lines") === "1";
      return NextResponse.json({
        order: mapWooOrder(raw),
        notes: Array.isArray(notes.data) ? notes.data.map(mapWooNote) : [],
        // ?lines=1 — shipping/fee/tax lines + meta keys (no customer data), used to mirror app orders
        ...(wantLines && {
          lines: {
            shipping_lines: raw.shipping_lines,
            fee_lines: raw.fee_lines,
            tax_lines: raw.tax_lines,
            prices_include_tax: raw.prices_include_tax,
            meta_keys: Array.isArray(raw.meta_data)
              ? (raw.meta_data as { key: string }[]).map((m) => m.key)
              : [],
            line_item_sample: Array.isArray(raw.line_items) ? (raw.line_items as Record<string, unknown>[]).slice(0, 1).map((li) => ({ subtotal: li.subtotal, total: li.total, total_tax: li.total_tax, tax_class: li.tax_class, taxes: li.taxes, meta: Array.isArray(li.meta_data) ? (li.meta_data as { key: string }[]).map((m) => m.key) : [] })) : [],
          },
        }),
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

/**
 * PATCH /api/woo/orders/:id { status } — change an order's status. Admin only.
 * "cancelled" makes WooCommerce restore the stock it had reduced.
 */
const ALLOWED_STATUS = new Set(["pending", "processing", "on-hold", "completed", "cancelled"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    if (!body.status || !ALLOWED_STATUS.has(body.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }
    const order = await wooSend<Record<string, unknown>>("PUT", `orders/${id}`, { status: body.status });
    return NextResponse.json({ order: mapWooOrder(order) });
  } catch (e) {
    return routeError(e);
  }
}

/** DELETE /api/woo/orders/:id — move a *cancelled* order to WooCommerce Trash (restorable). Admin only. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
    const current = await wooGet<{ status: string }>(`orders/${id}`);
    if (current.data.status !== "cancelled") {
      return NextResponse.json({ message: "Cancel the order first so its stock is restored" }, { status: 409 });
    }
    // no force=true → Trash, not a permanent delete
    const trashed = await wooSend<{ status: string }>("DELETE", `orders/${id}`, {});
    return NextResponse.json({ status: trashed.status });
  } catch (e) {
    return routeError(e);
  }
}
