import type { AppOrder, WooOrder } from "@/features/orders/types";

/** "2026-11" */
export type MonthKey = string;

export type ReportScope = "confirmed" | "completed";

/** Raw orders for one month, before counting. */
export type MonthOrders = {
  month: MonthKey;
  from: Date;
  to: Date;
  /** Firebase Orders created in the month */
  firebase: AppOrder[];
  /** every WooCommerce order created in the month */
  woo: WooOrder[];
  /** WooCommerce status of each Firebase order's twin (by Woo id), used to spot cancellations */
  wooStatusById: Record<string, string>;
  /** Woo ids that have a Firebase twin (those Woo orders are skipped — Firebase wins) */
  wooIdsWithTwin: string[];
  truncated: boolean;
};

export type ProductSales = {
  key: string;
  productId: number;
  name: string;
  units: number;
  orders: number;
  revenue: number;
  /** units from Firebase-recorded orders vs WooCommerce-only orders */
  unitsFirebase: number;
  unitsWoo: number;
};

export type MonthReport = {
  products: ProductSales[];
  units: number;
  revenue: number;
  ordersFirebase: number;
  ordersWoo: number;
  /** orders left out (cancelled, failed, refunded, unpaid online, or not completed in "completed" scope) */
  excluded: number;
};
