import { Timestamp } from "firebase/firestore";

/**
 * Firestore Orders/{id} → invoice. Reads every shape an order can have:
 *  - app orders (createSecureOrder): items[].salePrice, billing/shippingAddress {first_name, address_1…}, finalPayable
 *  - office orders (backendOrders):  same fields, sometimes `address` {name, address1…}
 *  - repriced orders (updateOrderPricing): items[].price/total, `total`, pricingOverridden
 */
type Raw = Record<string, unknown>;

export type InvoiceLine = { name: string; quantity: number; unitPrice: number; total: number };

export type InvoiceParty = {
  name: string;
  lines: string[];
  phone: string;
  email: string;
  /** set when the billing address differs from the delivery address */
  billingNote: string | null;
};

export type Invoice = {
  docId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceDate: Date | null;
  orderDate: Date | null;
  customer: InvoiceParty;
  items: InvoiceLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  codCharge: number;
  tax: number;
  walletUsed: number;
  total: number;
  paymentMethod: string;
  paid: boolean;
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const has = (v: unknown) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
const o = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export function toDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = o(v);
  if (typeof t.seconds === "number") return new Date(t.seconds * 1000);
  return null;
}

type Addr = { name: string; line1: string; line2: string; city: string; state: string; postcode: string; phone: string; email: string };

function addr(v: unknown): Addr {
  const a = o(v);
  return {
    name: s(a.name ?? a.Name) || [s(a.first_name ?? a.firstName), s(a.last_name ?? a.lastName)].filter(Boolean).join(" "),
    line1: s(a.address_1 ?? a.address1),
    line2: s(a.address_2 ?? a.address2 ?? a.landmark),
    city: s(a.city),
    state: s(a.state),
    postcode: s(a.postcode ?? a.pincode),
    phone: s(a.phone ?? a.Phone),
    email: s(a.email),
  };
}

const empty = (a: Addr) => !a.line1 && !a.name && !a.phone;
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "+919876543210" → "98765 43210" (as on the WooCommerce invoice) */
export function invoicePhone(p: string) {
  const d = p.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p;
}

function addressLines(a: Addr) {
  const cityLine = [a.city, a.state].filter(Boolean).join(", ");
  return [a.line1, a.line2, cityLine, a.postcode].filter(Boolean);
}

/** One "Bill & Ship To" block: delivery address first, gaps filled from billing. */
function combineParty(d: Raw): InvoiceParty {
  const ship = addr(d.shippingAddress);
  const bill = addr(d.billing);
  const loose = addr(d.address);
  const primary = !empty(ship) ? ship : !empty(bill) ? bill : loose;
  const other = primary === bill ? ship : bill;
  const merged: Addr = {
    name: primary.name || other.name || loose.name,
    line1: primary.line1 || other.line1,
    line2: primary.line2 || (primary.line1 ? "" : other.line2),
    city: primary.city || other.city,
    state: primary.state || other.state,
    postcode: primary.postcode || other.postcode,
    phone: primary.phone || other.phone || loose.phone,
    email: primary.email || other.email || s(d.email),
  };
  const differs =
    !empty(other) &&
    other !== primary &&
    other.line1 &&
    (norm(other.line1) !== norm(merged.line1) || (other.postcode && other.postcode !== merged.postcode));
  return {
    name: merged.name || "Customer",
    lines: addressLines(merged),
    phone: merged.phone ? invoicePhone(merged.phone) : "",
    email: merged.email,
    billingNote: differs ? addressLines(other).join(", ") : null,
  };
}

function lines(d: Raw): InvoiceLine[] {
  const items = Array.isArray(d.items) ? d.items : [];
  return items.map((v) => {
    const i = o(v);
    const quantity = n(i.quantity) || 1;
    const unitPrice = has(i.price) ? n(i.price) : n(i.salePrice);
    const total = has(i.total) ? n(i.total) : round2(unitPrice * quantity);
    return { name: s(i.name) || "Item", quantity, unitPrice, total };
  });
}

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  online: "Online (Razorpay)",
  razorpay: "Razorpay",
  cash: "Paid at office (Cash)",
  upi: "Paid at office (UPI)",
};

export function mapInvoice(docId: string, d: Raw): Invoice {
  const items = lines(d);
  const itemsSum = round2(items.reduce((t, i) => t + i.total, 0));
  const subtotal = has(d.subtotal) ? n(d.subtotal) : itemsSum;
  const shipping = n(d.shipping);
  const codCharge = n(d.codCharge);
  const tax = has(d.tax) ? n(d.tax) : round2(subtotal * 0.05);
  const walletUsed = n(d.walletUsed);
  const discount = n(d.discount);
  const computed = round2(subtotal - discount + shipping + codCharge + tax - walletUsed);
  // a repriced order keeps its new amount in `total`; app orders use finalPayable
  const total =
    d.pricingOverridden === true && has(d.total)
      ? n(d.total)
      : has(d.finalPayable)
        ? n(d.finalPayable)
        : has(d.total)
          ? n(d.total)
          : has(d.grossTotal)
            ? n(d.grossTotal)
            : computed;

  const orderNumber = s(d.wooOrderId) || docId;
  const createdAt = toDate(d.createdAt);
  const method = s(d.paymentMethod).toLowerCase();
  const ps = s(d.paymentStatus).toLowerCase();

  return {
    docId,
    orderNumber,
    invoiceNumber: s(d.invoiceNumber ?? d.invoiceNo) || orderNumber,
    invoiceDate: toDate(d.invoiceDate ?? d.invoicedAt) ?? createdAt,
    orderDate: createdAt,
    customer: combineParty(d),
    items,
    subtotal,
    discount,
    shipping,
    codCharge,
    tax,
    walletUsed,
    total,
    paymentMethod: PAYMENT_LABEL[method] ?? (s(d.paymentMethod) || "—"),
    paid: ["captured", "paid", "success", "completed"].includes(ps) || s(d.paymentLinkStatus) === "paid",
  };
}
