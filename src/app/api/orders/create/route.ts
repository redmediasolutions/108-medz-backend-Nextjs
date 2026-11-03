import { NextResponse } from "next/server";

import { computeTotals, round2, type StaffPaymentMode } from "@/features/orders/lib/order-pricing";
import type { StaffOrderInput, StaffOrderResult } from "@/features/orders/types";
import { phoneKey } from "@/lib/format";
import { firestoreRest, SERVER_TIME } from "@/lib/server/firestore-rest";
import { requireAdmin } from "@/lib/server/require-admin";
import { routeError } from "@/lib/server/route-error";
import { WooError, wooGet, wooSend } from "@/lib/server/woo";

/**
 * POST /api/orders/create — office staff place an order for a caller. Admin only.
 *
 * Mirrors what the 108 Medz app does for its own orders:
 *  1. WooCommerce order via REST (same fee line, shipping line, 5% tax, meta keys)
 *  2. Firestore Orders/{wooOrderId} with the same fields the app writes, so the order shows in
 *     the customer's app (when `uid` is set), the CRM and the Flutter admin like any app order.
 * Prices come from WooCommerce here, never from the browser. If the Firestore write fails the
 * Woo order is cancelled (stock is restored) so nothing is left half-created.
 */

class BadRequest extends Error {
  status = 400;
}

const PAYMENT_CONFIG: Record<StaffPaymentMode, { method: string; title: string; status: string; paid: boolean }> = {
  cod: {
    method: "cod",
    title: "Cash on Delivery",
    status: "processing",
    paid: false,
  },
  razorpay: {
    method: "razorpay",
    title: "Razorpay",
    status: "processing",
    paid: false,
  },
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function parse(body: unknown): StaffOrderInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const a = (b.address ?? {}) as Record<string, unknown>;
  const p = (b.payment ?? {}) as Record<string, unknown>;

  const phone = phoneKey(str(a.phone, 30));
  const address = {
    name: str(a.name, 80),
    phone,
    address1: str(a.address1, 250),
    address2: str(a.address2, 250),
    city: str(a.city, 80),
    state: str(a.state, 80),
    postcode: str(a.postcode, 10).replace(/\s/g, ""),
  };
  if (!address.name) throw new BadRequest("Customer name is required");
  if (phone.length !== 10) throw new BadRequest("Enter a valid 10-digit phone number");
  if (!address.address1) throw new BadRequest("Delivery address is required");
  if (!/^[1-9]\d{5}$/.test(address.postcode)) throw new BadRequest("Enter a valid 6-digit pincode");
  if (!address.state) throw new BadRequest("State is required");

  const rawItems = Array.isArray(b.items) ? b.items : [];
  const merged = new Map<number, number>();
  for (const it of rawItems as Record<string, unknown>[]) {
    const id = Number(it?.productId);
    const qty = Number(it?.quantity);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequest("Invalid product");
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw new BadRequest("Quantity must be between 1 and 999");
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }
  if (merged.size === 0) throw new BadRequest("Add at least one medicine");
  if (merged.size > 60) throw new BadRequest("Too many items in one order");

  const mode = p.mode as StaffPaymentMode;
  if (!(mode in PAYMENT_CONFIG)) throw new BadRequest("Choose a payment option");
  const reference = str(p.reference, 80);

  const clientRef = str(b.clientRef, 64);
  if (!clientRef) throw new BadRequest("Missing request id");

  return {
    uid: str(b.uid, 128) || null,
    address,
    items: [...merged].map(([productId, quantity]) => ({
      productId,
      quantity,
      name: "",
      price: 0,
    })) as StaffOrderInput["items"],
    payment: { mode, reference },
    note: str(b.note, 500),
    clientRef,
  };
}

/** A double click or network retry with the same clientRef gets the first result back. */
const inflight = new Map<string, { at: number; result: Promise<StaffOrderResult> }>();
const DEDUPE_MS = 10 * 60 * 1000;

type WooProduct = { id: number; name: string; price: string; status: string; images?: { src: string }[] };

async function createOrder(token: string, staffUid: string, input: StaffOrderInput): Promise<StaffOrderResult> {
  // 1. Authoritative prices from WooCommerce
  const ids = input.items.map((i) => i.productId);
  const { data: products } = await wooGet<WooProduct[]>("products", {
    include: ids.join(","),
    per_page: 100,
    _fields: "id,name,price,status,images",
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = input.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p || p.status !== "publish") throw new BadRequest(`Product #${i.productId} is not available in the store`);
    const price = Number(p.price);
    if (!Number.isFinite(price) || price <= 0) throw new BadRequest(`${p.name} has no price in the store`);
    return { productId: p.id, name: p.name, image: p.images?.[0]?.src ?? "", price, quantity: i.quantity };
  });

  const mode = input.payment.mode;
  const pay = PAYMENT_CONFIG[mode];
  const totals = computeTotals(lines, mode);

  // 2. Who is placing it + (for app users) make sure the customer exists
  const staff = await firestoreRest.get(token, `Users/${staffUid}`);
  const staffName = String(staff?.display_name || staff?.name || staff?.phone_number || "Office staff");
  if (input.uid) {
    const exists =
      (await firestoreRest.get(token, `Users/${encodeURIComponent(input.uid)}`)) ||
      (await firestoreRest.findId(token, "Users", "auth_uid", input.uid));
    if (!exists) throw new BadRequest("That app customer could not be found. Pick them again or use “New caller”.");
  }

  const a = input.address;
  const address = {
    first_name: a.name,
    address_1: a.address1,
    address_2: a.address2,
    city: a.city,
    state: a.state,
    postcode: a.postcode,
    country: "IN",
    phone: `+91${a.phone}`,
  };

  // 3. WooCommerce order — same shape as the app's (fee line, flat-rate shipping, meta keys)
  const woo = await wooSend<{ id: number; total: string }>("POST", "orders", {
    status: pay.status,
    payment_method: pay.method,
    payment_method_title: pay.title,
    set_paid: pay.paid,
    ...(pay.paid && input.payment.reference && { transaction_id: input.payment.reference }),
    customer_note: input.note,
    billing: { ...address, last_name: "" },
    shipping: { ...address, last_name: "" },
    line_items: lines.map((l) => {
      const t = round2(l.price * l.quantity).toFixed(2);
      return { product_id: l.productId, quantity: l.quantity, subtotal: t, total: t };
    }),
    shipping_lines: totals.shipping
      ? [{ method_id: "flat_rate", method_title: "Standard Shipping", total: totals.shipping.toFixed(2) }]
      : [],
    fee_lines: totals.codCharge
      ? [{ name: "Cash on Delivery Charges", total: totals.codCharge.toFixed(2), tax_status: "none" }]
      : [],
    meta_data: [
      { key: "app_uid", value: input.uid ?? "" },
      { key: "cod_charge", value: String(totals.codCharge) },
      { key: "wallet_used", value: "0" },
      { key: "order_source", value: "office" },
      { key: "placed_by", value: staffName },
      { key: "placed_by_uid", value: staffUid },
      { key: "crm_client_ref", value: input.clientRef },
    ],
  });
  const wooId = woo.id;
  const note = (text: string) => wooSend("POST", `orders/${wooId}/notes`, { note: text }).catch(() => null);

  // 4. Firestore Orders/{wooId} — the same fields the app writes, plus who placed it
  try {
    await firestoreRest.create(token, `Orders/${wooId}`, {
      billing: address,
      shippingAddress: address,
      items: lines.map((l) => ({
        image: l.image,
        name: l.name,
        productId: l.productId,
        quantity: l.quantity,
        requiresPrescription: false,
        salePrice: l.price,
      })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      codCharge: totals.codCharge,
      walletUsed: 0,
      walletDeducted: false,
      grossTotal: totals.finalPayable,
      finalPayable: totals.finalPayable,
      paymentMethod: mode,
      paymentStatus: pay.paid ? "paid" : "pending",
      status: pay.status,
      finalized: pay.paid,
      paymentExpiresAt: Date.now() + 15 * 60 * 1000,
      razorpayOrderId: null,
      razorpayPaymentId: null,
      rewardReleased: false,
      rewardReversed: false,
      uid: input.uid,
      wooOrderId: String(wooId),
      createdAt: SERVER_TIME,
      updatedAt: SERVER_TIME,
      // office orders only
      source: "office",
      placedBy: { uid: staffUid, name: staffName },
      paymentReference: input.payment.reference || null,
      customerNote: input.note || null,
    });
  } catch (e) {
    // Don't leave a Woo order without its Firebase twin: cancel it (Woo restores stock)
    await wooSend("PUT", `orders/${wooId}`, { status: "cancelled" }).catch(() => null);
    await note(`⚠️ Cancelled automatically: saving to Firebase failed (${e instanceof Error ? e.message : "error"})`);
    throw new WooError(`Saving to Firebase failed, so WooCommerce order #${wooId} was cancelled. Nothing was charged — please try again.`, 502);
  }

  // 5. Same style of order notes the app leaves (oldest first)
  await note(`🏢 Order placed by office staff: ${staffName} (108Medz CRM)`);
  await note(`💳 Payment Method: ${pay.title}${input.payment.reference ? ` · Ref ${input.payment.reference}` : ""}`);
  await note(`💰 Final Payable Amount: ₹${totals.finalPayable}`);
  await note("🔥 Firestore order created successfully");

  const wooTotal = Number(woo.total);
  const warning =
    Number.isFinite(wooTotal) && Math.abs(wooTotal - totals.finalPayable) > 0.05
      ? `WooCommerce total is ₹${wooTotal}, app formula gives ₹${totals.finalPayable}. Check the order in WooCommerce.`
      : undefined;

  return {
    success: true,
    wooOrderId: wooId,
    finalPayable: totals.finalPayable,
    ...(warning && { warning }),
  };
}

export async function POST(req: Request) {
  try {
    const staffUid = await requireAdmin(req);
    const token = (req.headers.get("authorization") ?? "").slice(7);
    const input = parse(await req.json().catch(() => null));

    const now = Date.now();
    for (const [k, v] of inflight) if (now - v.at > DEDUPE_MS) inflight.delete(k);
    const key = `${staffUid}:${input.clientRef}`;
    let entry = inflight.get(key);
    if (!entry) {
      entry = { at: now, result: createOrder(token, staffUid, input) };
      inflight.set(key, entry);
      // a failed attempt may be retried with the same clientRef
      entry.result.catch(() => inflight.delete(key));
    }
    return NextResponse.json(await entry.result);
  } catch (e) {
    return routeError(e);
  }
}
