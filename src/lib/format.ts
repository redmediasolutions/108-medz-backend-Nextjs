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

/** "+919876543210" / "919876543210" / "9876543210" → all variants to match Firestore phone_number. */
export function phoneVariants(input: string): string[] {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  const set = new Set<string>([raw]);
  if (ten.length === 10) {
    set.add(ten);
    set.add(`+91${ten}`);
    set.add(`91${ten}`);
  }
  return [...set].filter(Boolean);
}
