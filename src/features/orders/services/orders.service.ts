import { mergeOrder, mergeOrderLists } from "../lib/merge-orders";
import { phoneKeys } from "../lib/order-utils";
import type { WooListParams } from "../repository/orders.repository";
import { ordersRepository as repo } from "../repository/orders.repository";
import type { AppOrder, OrderFilters, UnifiedOrder, WooOrder, WooOrderNote } from "../types";
import { ORDERS_PAGE_SIZE } from "../types";


const CREATED_VIA: Record<string, string | undefined> = { phone: "admin", website: "checkout" };

/**
 * WooCommerce search is plain text, so "9845012340" never finds an order saved as "98450 12340" or
 * "984 501 2340". Search by the last 4 digits (contiguous in almost every format), then keep only
 * orders whose phone really is that number.
 */
const PHONE_SEARCH_PAGES = 5;

async function wooSearchAll(params: WooListParams & { search: string }): Promise<WooOrder[]> {
  const first = await repo.wooList({ ...params, page: 1, perPage: 100 });
  const pages = Math.min(first.totalPages || 1, PHONE_SEARCH_PAGES);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => repo.wooList({ ...params, page: i + 2, perPage: 100 }))
  );
  return [first, ...rest].flatMap((r) => r.orders);
}

function orderPhones(o: WooOrder) {
  return new Set([...phoneKeys(o.billing.phone), ...phoneKeys(o.shipping.phone)]);
}

/** Digits-only search term that looks like a phone number (≥ 7 digits). */
function phoneQuery(search: string): string | null {
  const t = search.trim();
  if (!/^[+\d\s().-]+$/.test(t)) return null;
  const d = t.replace(/\D/g, "");
  return d.length >= 7 ? (d.length > 10 ? d.slice(-10) : d) : null;
}

const phoneSearchCache = new Map<string, { at: number; orders: WooOrder[] }>();

export type OrdersPage = {
  rows: UnifiedOrder[];
  total: number;
  totalPages: number;
  /** Firebase twins couldn't be loaded (rules / network) — rows still show Woo data */
  appError: string | null;
};

export const ordersService = {
  /** WooCommerce-led list (All / Phone / Website), each row enriched with its Firebase twin. */
  async wooPage(f: OrderFilters, page: number, pageSize = ORDERS_PAGE_SIZE): Promise<OrdersPage> {
    const digits = phoneQuery(f.search);
    const res = digits ? await ordersService.wooPhoneSearch(f, digits, page, pageSize) : await repo.wooList({
      page,
      perPage: pageSize,
      status: f.status,
      search: f.search.trim(),
      after: f.from,
      before: f.to,
      createdVia: CREATED_VIA[f.source],
    });
    let app: AppOrder[] = [];
    let appError: string | null = null;
    try {
      app = await repo.appByWooIds(res.orders.map((o) => o.id));
    } catch (e) {
      appError = (e as Error).message;
    }
    const byWoo = new Map(app.filter((a) => a.wooOrderId).map((a) => [a.wooOrderId!, a]));
    let rows = res.orders.map((w) => mergeOrder(w, byWoo.get(w.id) ?? null));
    // An app order that Woo shows as created via admin/checkout is still an app order — keep the filter honest
    if (f.source === "phone" || f.source === "website") rows = rows.filter((r) => r.source === f.source);
    return { rows, total: res.total, totalPages: res.totalPages, appError };
  },

  /** Orders-page search by phone, format-proof. Results are paginated in the browser. */
  async wooPhoneSearch(f: OrderFilters, digits: string, page: number, pageSize: number) {
    const key = JSON.stringify([f.status, f.from, f.to, f.source, digits]);
    let hit = phoneSearchCache.get(key);
    if (!hit || Date.now() - hit.at > 60_000) {
      const found = await wooSearchAll({
        search: digits.slice(-4),
        status: f.status,
        after: f.from,
        before: f.to,
        createdVia: CREATED_VIA[f.source],
      });
      const orders = found.filter((o) => [...orderPhones(o)].some((k) => k.includes(digits)));
      hit = { at: Date.now(), orders };
      if (phoneSearchCache.size > 50) phoneSearchCache.clear();
      phoneSearchCache.set(key, hit);
    }
    const start = (page - 1) * pageSize;
    return {
      orders: hit.orders.slice(start, start + pageSize),
      total: hit.orders.length,
      totalPages: Math.max(1, Math.ceil(hit.orders.length / pageSize)),
    };
  },

  /** App orders (Firebase) created on/after `from`, newest first. */
  appSince: (from: Date | null) => repo.appSince(from),

  /** Live Woo data for a set of order ids (enriches a page of app orders with current status). */
  async wooByIds(ids: number[]): Promise<WooOrder[]> {
    if (!ids.length) return [];
    return (await repo.wooList({ include: ids, perPage: Math.min(100, ids.length) })).orders;
  },

  /** One order by route key (Woo id or Firebase doc id). */
  async get(key: string): Promise<{ order: UnifiedOrder | null; notes: WooOrderNote[]; wooError: string | null }> {
    const numeric = /^\d+$/.test(key);
    let wooError: string | null = null;
    const wooReq = numeric
      ? repo.wooGet(key).catch((e: Error) => ((wooError = e.message), { order: null, notes: [] }))
      : Promise.resolve({ order: null, notes: [] as WooOrderNote[] });
    const [app, woo] = await Promise.all([repo.appGet(key).catch(() => null), wooReq]);

    let wooOrder = woo.order;
    let notes = woo.notes;
    if (!wooOrder && app?.wooOrderId && !numeric) {
      const r = await repo.wooGet(app.wooOrderId).catch((e: Error) => ((wooError = e.message), { order: null, notes: [] }));
      wooOrder = r.order;
      notes = r.notes;
    }
    if (!wooOrder && !app) return { order: null, notes: [], wooError };
    return { order: mergeOrder(wooOrder, app), notes, wooError };
  },

  /**
   * Woo orders for a customer, matched by any of their phone numbers (format-proof, see above) or email.
   */
  async wooForCustomer(phone: string, email: string): Promise<WooOrder[]> {
    const keys = phoneKeys(phone);
    const mail = email.trim().toLowerCase();
    const terms = [...new Set(keys.map((k) => k.slice(-4))), mail].filter(Boolean);
    const results = await Promise.all(terms.map((t) => wooSearchAll({ search: t })));
    const byId = new Map<number, WooOrder>();
    for (const list of results) for (const o of list) byId.set(o.id, o);
    return [...byId.values()].filter((o) => {
      const phones = orderPhones(o);
      return keys.some((k) => phones.has(k)) || (mail && o.billing.email.toLowerCase() === mail);
    });
  },

  subscribeAppByUid: repo.subscribeAppByUid,
  merge: mergeOrderLists,
};
