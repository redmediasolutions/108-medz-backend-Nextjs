/** Firestore collection names — kept identical to the Flutter app. */
export const COLLECTIONS = {
  users: "Users",
  prescriptions: "Prescription",
  searchHistory: "searchHistory",
} as const;

/** Additional collections used by the Customers feature (same names as Flutter). */
export const CUSTOMER_COLLECTIONS = {
  orders: "Orders",
  carts: "carts",
  cartItems: "items",
  addresses: "Addresses",
  walletTransactions: "walletTransactions",
} as const;
