import { mergeOrder, mergeOrderLists } from "../lib/merge-orders";
import { phoneKey } from "../lib/order-utils";
import { ordersRepository as repo } from "../repository/orders.repository";
import type { AppOrder, OrderFilters, UnifiedOrder, WooOrder, WooOrderNote } from "../types";
import { ORDERS_PAGE_SIZE } from "../types";


const CREATED_VIA: Record<string, string | undefined> = { phone: "admin", website: "checkout" };

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
    const res = await repo.wooList({
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
   * Woo orders for a customer: searched by phone (last 10 digits) and email, then filtered
   * to exact matches because Woo search is fuzzy.
   */
  async wooForCustomer(phone: string, email: string): Promise<WooOrder[]> {
    const pk = phoneKey(phone);
    const mail = email.trim().toLowerCase();
    const searches = [pk.length === 10 ? pk : "", mail].filter(Boolean);
    const results = await Promise.all(searches.map((s) => repo.wooList({ search: s, perPage: 100 })));
    const byId = new Map<number, WooOrder>();
    for (const r of results) for (const o of r.orders) byId.set(o.id, o);
    return [...byId.values()].filter((o) => {
      const phones = [o.billing.phone, o.shipping.phone].map(phoneKey);
      return (pk && phones.includes(pk)) || (mail && o.billing.email.toLowerCase() === mail);
    });
  },

  subscribeAppByUid: repo.subscribeAppByUid,
  merge: mergeOrderLists,
};
