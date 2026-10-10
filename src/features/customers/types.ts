/** Firestore Users/{id} — port of models/customers.dart */
export type Customer = {
  id: string;
  /** auth_uid ?? authUid ?? doc id — used for carts/{uid} and Orders.uid */
  authUid: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  createdAt: Date | null;
  isProfileComplete: boolean;
  isAnonymous: boolean;
  isAdmin: boolean;
  rewardPoints: number;
};

export type CustomerFilters = {
  /** phone number search (exact match, +91 variants tried) */
  phone: string;
  /** yyyy-mm-dd from <input type="date"> */
  from: string;
  to: string;
};

export type OrderAddress = {
  firstName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

export type OrderItem = {
  productId: number;
  name: string;
  image: string;
  quantity: number;
  salePrice: number;
  requiresPrescription: boolean;
};

/** Firestore Orders/{id} (subset used on the customer screen) — see pages/orders/order_model.dart */
export type CustomerOrder = {
  id: string;
  wooOrderId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shipping: number;
  walletUsed: number;
  finalPayable: number;
  createdAt: Date | null;
  items: OrderItem[];
  shippingAddress: OrderAddress;
  billing: OrderAddress;
};

/** Firestore carts/{authUid}/items/{id} */
export type CartItem = {
  id: string;
  name: string;
  image: string;
  contents: string;
  mrp: number;
  salePrice: number;
  quantity: number;
};

/** Firestore Addresses/{id} (address map + userRef) */
export type CustomerAddress = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address1: string;
  landmark: string;
  state: string;
  pincode: string;
  country: string;
};

export type WalletStatus = "credited" | "debited" | "pending" | "reversed" | (string & {});

/** Firestore Users/{id}/walletTransactions — port of models/reward_transaction.dart */
export type WalletTransaction = {
  id: string;
  type: "credit" | "debit" | (string & {});
  status: WalletStatus;
  amount: number;
  reason: string;
  orderId: string | null;
  createdAt: Date | null;
};

export type WalletAdjustment = {
  amount: number;
  status: "credited" | "debited" | "pending";
  reason: string;
};

export const CUSTOMERS_PAGE_SIZE = 20;
