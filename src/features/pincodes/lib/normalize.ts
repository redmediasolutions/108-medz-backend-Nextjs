import type { OrderAddress } from "@/features/orders/types";

/** Indian pincode: 6 digits, first digit 1–9. Anything else → null. */
export function normPincode(v: string | number | null | undefined): string | null {
  const d = String(v ?? "").replace(/\D/g, "");
  return /^[1-9]\d{5}$/.test(d) ? d : null;
}

export function phoneKey(v: string) {
  const d = (v || "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

const TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "shri", "smt", "sri", "kum"]);

/** "Mr. Ramesh  SHETTY" → "ramesh shetty" (tokens sorted so "Shetty Ramesh" matches too). */
export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !TITLES.has(t))
    .sort()
    .join(" ");
}

/** Words that appear in most addresses and say nothing about which house it is. */
const ADDRESS_NOISE = new Set([
  "near", "opp", "opposite", "behind", "beside", "next", "to", "the", "of", "and", "at", "in",
  "road", "rd", "street", "st", "lane", "ln", "cross", "main", "layout", "nagar", "colony", "post",
  "house", "home", "flat", "no", "number", "door", "floor", "apartment", "apartments", "apt", "apts",
  "appartment", "appartments", "building", "bldg", "residency", "enclave", "complex", "block",
  "village", "taluk", "district", "dist", "po", "india",
]);

const ABBREV: Record<string, string> = { "1st": "1", "2nd": "2", "3rd": "3", first: "1", second: "2", third: "3" };

/** Meaningful address tokens (house numbers, landmarks, locality) for similarity. */
export function addressTokens(a: Pick<OrderAddress, "address1" | "address2" | "city" | "state" | "postcode">): Set<string> {
  const drop = new Set(
    [a.city, a.state, a.postcode]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
  const tokens = `${a.address1} ${a.address2}`
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .split(/[^a-z0-9]+/)
    .map((t) => ABBREV[t] ?? t)
    .filter((t) => t && !ADDRESS_NOISE.has(t) && !drop.has(t) && (t.length > 1 || /\d/.test(t)));
  return new Set(tokens);
}

/** Exact-match key for an address: sorted meaningful tokens. "" when too little to go on. */
export function addressKey(a: Pick<OrderAddress, "address1" | "address2" | "city" | "state" | "postcode">): string {
  const t = [...addressTokens(a)].sort();
  return t.length >= 2 ? t.join(" ") : "";
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Pincode an order was delivered to (shipping first, then billing). */
export function orderPincode(o: { shippingAddress: OrderAddress; billing: OrderAddress }): string | null {
  return normPincode(o.shippingAddress.postcode) ?? normPincode(o.billing.postcode);
}

export function orderAddress(o: { shippingAddress: OrderAddress; billing: OrderAddress }): OrderAddress {
  const s = o.shippingAddress;
  return s.address1 || s.address2 ? s : o.billing;
}

export function displayAddress(a: OrderAddress) {
  return [a.address1, a.address2, a.city].filter(Boolean).join(", ");
}

/** House / flat / door numbers in an address token set. */
export function numberTokens(tokens: Set<string>): Set<string> {
  return new Set([...tokens].filter((t) => /\d/.test(t)));
}
