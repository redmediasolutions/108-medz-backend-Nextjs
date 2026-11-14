import { monthRange } from "../lib/month";
import { reportsRepository as repo } from "../repository/reports.repository";
import type { MonthKey, MonthOrders } from "../types";

export const reportsService = {
  /** Firebase + WooCommerce orders for a month, with the twin links needed to count each order once. */
  async loadMonth(month: MonthKey, fresh = false): Promise<MonthOrders> {
    const { from, to, after, before } = monthRange(month);
    const [firebase, woo] = await Promise.all([repo.firebaseBetween(from, to), repo.wooBetween(after, before, fresh)]);

    // Woo orders that also exist in Firebase — those in this month's Firebase list, plus twins
    // created just across the month boundary (so they're never counted twice).
    const fbIds = new Set<string>();
    for (const o of firebase) {
      fbIds.add(o.id);
      if (o.wooOrderId) fbIds.add(String(o.wooOrderId));
    }
    const unknown = woo.orders.filter((w) => !fbIds.has(String(w.id))).map((w) => w.id);
    const extraTwins = await repo.firebaseTwins(unknown).catch(() => []);
    for (const t of extraTwins) {
      fbIds.add(t.id);
      if (t.wooOrderId) fbIds.add(String(t.wooOrderId));
    }

    const wooStatusById: Record<string, string> = {};
    for (const w of woo.orders) wooStatusById[String(w.id)] = w.status;

    return {
      month,
      from,
      to,
      firebase,
      woo: woo.orders,
      wooStatusById,
      wooIdsWithTwin: woo.orders.filter((w) => fbIds.has(String(w.id))).map((w) => String(w.id)),
      truncated: woo.truncated,
    };
  },
};
