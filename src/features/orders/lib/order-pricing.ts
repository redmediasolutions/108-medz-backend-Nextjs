/**
 * Pricing rules of the 108 Medz app, read from real Firestore `Orders` + their WooCommerce twins:
 *  - tax        = 5% of the item subtotal (shipping and COD charge are not taxed)
 *  - shipping   = ₹49 when the item subtotal is below ₹500, otherwise free
 *  - COD charge = ₹60 for cash on delivery ("Cash on Delivery Charges" fee line in Woo)
 *  - payable    = subtotal + tax + shipping + COD charge − wallet used
 * Shared by the New order form (live preview) and /api/orders/create (authoritative).
 */
export const TAX_RATE = 0.05;
export const SHIPPING_FEE = 49;
export const FREE_SHIPPING_FROM = 500;
export const COD_CHARGE = 60;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type StaffPaymentMode = "cod" | "cash" | "upi";

export const PAYMENT_MODES: { value: StaffPaymentMode; label: string; hint: string }[] = [
  { value: "cod", label: "Cash on delivery", hint: `Customer pays on delivery · +₹${COD_CHARGE} COD charge` },
  { value: "cash", label: "Paid at office · Cash", hint: "Already collected in cash" },
  { value: "upi", label: "Paid at office · UPI", hint: "Already paid by UPI — note the reference" },
];

export type OrderTotals = {
  subtotal: number;
  tax: number;
  shipping: number;
  codCharge: number;
  walletUsed: number;
  finalPayable: number;
};

export function computeTotals(lines: { price: number; quantity: number }[], mode: StaffPaymentMode): OrderTotals {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const tax = round2(subtotal * TAX_RATE);
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_FROM ? SHIPPING_FEE : 0;
  const codCharge = mode === "cod" && subtotal > 0 ? COD_CHARGE : 0;
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

/** Active selling price of a search result (sale price when set, else price). */
export function productPrice(p: { price: string; salePrice: string; regularPrice?: string }): number {
  for (const v of [p.salePrice, p.price, p.regularPrice]) {
    const n = Number(v);
    if (v !== "" && v !== undefined && Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
