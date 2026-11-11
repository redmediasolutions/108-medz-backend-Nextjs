/**
 * Pricing rules of the 108 Medz app, mirrored from Cloud Functions (backendOrders & createSecureOrder):
 *  - tax        = 5% of the item subtotal (shipping and COD charge are not taxed)
 *  - shipping   = ₹49 when item subtotal is <= ₹499, otherwise free (> ₹499)
 *  - COD charge = ₹60 for Cash on Delivery ("Cash on Delivery Charges" fee line in Woo)
 *  - payable    = subtotal + tax + shipping + COD charge − wallet used
 */

export const TAX_RATE = 0.05;
export const SHIPPING_FEE = 49;
export const FREE_SHIPPING_FROM = 499; // Free shipping applies above ₹499 (matches Cloud Function threshold)
export const COD_CHARGE = 60;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type StaffPaymentMode = "cod" | "razorpay";

export const PAYMENT_MODES: { value: StaffPaymentMode; label: string; hint: string }[] = [
  {
    value: "cod",
    label: "Cash on Delivery",
    hint: `Customer pays on delivery · +₹${COD_CHARGE} COD charge`,
  },
  {
    value: "razorpay",
    label: "Pay via Razorpay",
    hint: "Payment link, UPI, card, or net banking",
  },
];

export type OrderTotals = {
  subtotal: number;
  tax: number;
  shipping: number;
  codCharge: number;
  walletUsed: number;
  finalPayable: number;
};

export function computeTotals(
  lines: { price: number; quantity: number }[],
  mode: StaffPaymentMode,
  opts: { waiveCod?: boolean } = {}
): OrderTotals {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const tax = round2(subtotal * TAX_RATE);
  const shipping = subtotal > 0 && subtotal <= FREE_SHIPPING_FROM ? SHIPPING_FEE : 0;
  // front desk can waive the COD charge (₹0) for a customer
  const codCharge = mode === "cod" && subtotal > 0 && !opts.waiveCod ? COD_CHARGE : 0;
  const walletUsed = 0;

  return {
    subtotal,
    tax,
    shipping,
    codCharge,
    walletUsed,
    finalPayable: round2(subtotal + tax + shipping + codCharge - walletUsed),
  };
}

/** Active selling price of a search result (sale price when set, else regular price). */
export function productPrice(p: { price: string; salePrice: string; regularPrice?: string }): number {
  for (const v of [p.salePrice, p.price, p.regularPrice]) {
    const n = Number(v);
    if (v !== "" && v !== undefined && Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}