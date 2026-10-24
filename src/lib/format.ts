const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

/** ₹ format; returns null for empty / zero / non-numeric so callers can hide it. */
export function formatINR(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) return null;
  return inr.format(n);
}

/** ₹ format that always returns a string (0 → ₹0.00). */
export function formatINRStrict(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return inr.format(Number.isNaN(n) ? 0 : n);
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function initials(name: string | null | undefined, fallback = "?") {
  const s = (name ?? "").trim();
  if (!s) return fallback;
  return s
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Every 10-digit mobile number in a free-text phone field. Handles the formats staff actually type in
 * WooCommerce: "9845012340", "98450 12340", "984 501 2340", "+91 98450-12340", ":9845012340",
 * and two numbers in one field ("9845012340 / 9886011111").
 */
export function phoneKeys(raw: string | null | undefined): string[] {
  const out = new Set<string>();
  for (const part of String(raw ?? "").split(/[\/,;|&]|\bor\b/i)) {
    const d = part.replace(/\D/g, "");
    if (d.length === 20) {
      out.add(d.slice(0, 10));
      out.add(d.slice(10));
    } else if (d.length >= 10) {
      out.add(d.slice(-10));
    }
  }
  return [...out];
}

/** The first (main) 10-digit number in a phone field, or "" when there is none. */
export function phoneKey(raw: string | null | undefined): string {
  return phoneKeys(raw)[0] ?? "";
}

/** True when two free-text phone fields share any number. */
export function samePhone(a: string, b: string) {
  const bs = new Set(phoneKeys(b));
  return phoneKeys(a).some((k) => bs.has(k));
}

/** All the ways a number may be stored in Firestore Users.phone_number (exact-match queries). */
export function phoneVariants(input: string): string[] {
  const raw = input.trim();
  const set = new Set<string>(raw ? [raw] : []);
  for (const k of phoneKeys(raw)) {
    set.add(k);
    set.add(`+91${k}`);
    set.add(`91${k}`);
  }
  return [...set].slice(0, 30);
}
