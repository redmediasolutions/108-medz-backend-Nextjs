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
    const body = (await req.json().catch(() => ({}))) as { status?: string; action?: string };

    // { action: "waive-cod" } — front desk removes the "Cash on Delivery Charges" fee line.
    // WooCommerce recalculates the order total when fee lines change. Safe to repeat.
    if (body.action === "waive-cod") {
      type Fee = { id: number; name: string; total: string };
      const { data: cur } = await wooGet<{ total: string; fee_lines?: Fee[] }>(`orders/${id}`, { _fields: "id,total,fee_lines" });
      const cod = (cur.fee_lines ?? []).filter((f) => /cash\s*on\s*delivery|\bcod\b/i.test(f.name));
      if (cod.length === 0) return NextResponse.json({ total: Number(cur.total), removed: 0 });
      const updated = await wooSend<{ total: string }>("PUT", `orders/${id}`, {
        fee_lines: cod.map((f) => ({ id: f.id, name: null })),
        meta_data: [{ key: "cod_charge", value: "0" }],
      });
      await wooSend("POST", `orders/${id}/notes`, { note: "🧾 COD charge waived by front desk (108Medz CRM)" }).catch(() => null);
      return NextResponse.json({ total: Number(updated.total), removed: cod.length });
    }

    // { action: "sync-items", items:[{productId, quantity, price}], shipping } — make the Woo order's
    // products / quantities / prices / delivery charge match the CRM edit (adds, removes, updates).
    // WooCommerce recalculates tax and total when line items change.
    if (body.action === "sync-items") {
      const b = body as unknown as { items?: { productId: number; quantity: number; price: number }[]; shipping?: number };
      const want = (b.items ?? []).filter((i) => Number(i.productId) > 0 && Number(i.quantity) > 0);
      if (want.length === 0) return NextResponse.json({ message: "An order needs at least one product" }, { status: 400 });
      type Line = { id: number; product_id: number; variation_id?: number };
      type Ship = { id: number; method_id: string; total: string };
      const { data: cur } = await wooGet<{ line_items?: Line[]; shipping_lines?: Ship[] }>(`orders/${id}`, {
        _fields: "id,line_items,shipping_lines",
      });
      const existing = cur.line_items ?? [];
      const byProduct = new Map<number, Line>();
      for (const l of existing) if (!byProduct.has(l.product_id)) byProduct.set(l.product_id, l);
      const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
      const wanted = new Set(want.map((i) => Number(i.productId)));
      const line_items: Record<string, unknown>[] = [
        // update kept products, add new ones
        ...want.map((i) => {
          const qty = Math.floor(Number(i.quantity));
          const total = money(Number(i.price) * qty);
          const ex = byProduct.get(Number(i.productId));
          return ex
            ? { id: ex.id, quantity: qty, subtotal: total, total }
            : { product_id: Number(i.productId), quantity: qty, subtotal: total, total };
        }),
        // remove products no longer in the order (and duplicate lines of a kept product)
        ...existing
          .filter((l) => !wanted.has(l.product_id) || byProduct.get(l.product_id)!.id !== l.id)
          .map((l) => ({ id: l.id, quantity: 0 })),
      ];
      const ship = Math.max(0, Number(b.shipping ?? 0));
      const lines = cur.shipping_lines ?? [];
      const shipping_lines =
        lines.length > 0
          ? [{ id: lines[0].id, total: money(ship) }, ...lines.slice(1).map((l) => ({ id: l.id, method_id: null }))]
          : ship > 0
            ? [{ method_id: "flat_rate", method_title: "Standard Shipping", total: money(ship) }]
            : [];
      const updated = await wooSend<{ total: string }>("PUT", `orders/${id}`, { line_items, shipping_lines });
      await wooSend("POST", `orders/${id}/notes`, { note: "✏️ Items / prices edited from 108Medz CRM" }).catch(() => null);
      return NextResponse.json({ total: Number(updated.total) });
    }

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
