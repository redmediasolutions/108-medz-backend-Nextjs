/**
 * Orders come from two places:
 *  - WooCommerce: every order — app, phone/office (staff create it in wp-admin) and website.
 *  - Firebase `Orders`: app orders only. Doc id == wooOrderId once synced to Woo, and it holds
 *    app-only data (wallet used, COD charge, rewards, Razorpay ids, Firebase uid).
 * `UnifiedOrder` merges both so each order appears once.
 */

export type OrderAddress = {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
};

export type OrderLineItem = {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  image: string;
  requiresPrescription: boolean;
};

/** Slim WooCommerce order (mapped server-side in /api/woo/orders). Dates are ISO strings. */
export type WooOrder = {
  id: number;
  number: string;
  status: string;
  /** "admin" = created by staff in wp-admin (phone orders), "checkout" = website, "rest-api" = via API */
  createdVia: string;
  currency: string;
  createdAt: string | null;
  paidAt: string | null;
  completedAt: string | null;
  total: number;
  totalTax: number;
  shippingTotal: number;
  discountTotal: number;
  refundTotal: number;
  fees: { name: string; total: number }[];
  coupons: string[];
  customerId: number;
  customerNote: string;
  paymentMethod: string;
  paymentMethodTitle: string;
  transactionId: string;
  billing: OrderAddress;
  shipping: OrderAddress;
  items: OrderLineItem[];
};

export type WooOrderNote = {
  id: number;
  author: string;
  note: string;
  customerNote: boolean;
  createdAt: string | null;
};

/** Firebase Orders/{id} (see Flutter pages/orders/order_model.dart + Firestore console). */
export type AppOrder = {
  id: string;
  wooOrderId: number | null;
  uid: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  subtotal: number;
  shipping: number;
  tax: number;
  codCharge: number;
  walletUsed: number;
  finalPayable: number;
  rewardAmount: number;
  rewardReleased: boolean;
  rewardReversed: boolean;
  createdAt: Date | null;
  items: OrderLineItem[];
  billing: OrderAddress;
  shippingAddress: OrderAddress;
};

export type OrderSource = "app" | "phone" | "website" | "other";

export type PaymentState = "paid" | "pending" | "failed" | "refunded" | "cancelled";

export type UnifiedOrder = {
  /** route key: Woo id when it exists, else Firebase doc id */
  key: string;
  wooId: number | null;
  appId: string | null;
  number: string;
  source: OrderSource;
  /** app order that never reached WooCommerce */
  unsynced: boolean;
  status: string;
  createdAt: Date | null;
  currency: string;

  /** amount actually payable/collected (app: finalPayable after wallet; Woo: total) */
  total: number;
  wooTotal: number | null;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  codCharge: number;
  walletUsed: number;
  refunded: number;
  rewardAmount: number;
  rewardReleased: boolean;
  coupons: string[];
  fees: { name: string; total: number }[];

  payment: {
    method: string;
    methodTitle: string;
    state: PaymentState;
    rawStatus: string;
    transactionId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: Date | null;
  };

  customer: {
    name: string;
    phone: string;
    email: string;
    /** Firebase auth uid (app orders) */
    uid: string | null;
    wooCustomerId: number | null;
  };
  billing: OrderAddress;
  shippingAddress: OrderAddress;
  items: OrderLineItem[];
  customerNote: string;
};

export type OrdersSourceFilter = "all" | "app" | "phone" | "website" | "unsynced";

export type OrderFilters = {
  source: OrdersSourceFilter;
  status: string;
  search: string;
  /** yyyy-mm-dd */
  from: string;
  to: string;
};

export const ORDERS_PAGE_SIZE = 25;
