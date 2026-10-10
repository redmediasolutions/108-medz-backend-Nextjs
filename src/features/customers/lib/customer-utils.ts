import { formatDate } from "@/lib/format";

import type { Customer, CustomerOrder, WalletTransaction } from "../types";

/** Same balance maths as CustomerRewardsScreen._rewardBalanceCard (Flutter). */
export function walletSummary(transactions: WalletTransaction[]) {
  let available = 0;
  let pending = 0;
  for (const tx of transactions) {
    if (tx.status === "pending") pending += tx.amount;
    else if (tx.status === "credited") available += tx.amount;
    else if (tx.status === "debited" || tx.type === "debit") available -= tx.amount;
  }
  return { available: Math.max(0, available), pending };
}

export type Tone = "success" | "destructive" | "warning" | "neutral";

/** Port of _statusColor in customer_orders.dart */
export function orderStatusTone(status: string): Tone {
  switch (status.toLowerCase()) {
    case "completed":
    case "delivered":
      return "success";
    case "cancelled":
    case "canceled":
      return "destructive";
    case "processing":
    case "packed":
    case "shipped":
      return "warning";
    default:
      return "neutral";
  }
}

export function orderLabel(o: CustomerOrder) {
  return o.wooOrderId ? `#${o.wooOrderId}` : `#${o.id.slice(0, 8)}`;
}

export function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const CUSTOMER_CSV_HEADER = [
  "Customer ID",
  "Auth UID",
  "Name",
  "Email",
  "Phone",
  "Joined Date",
  "User Type",
  "Role",
  "Profile Complete",
];

/** Port of Customer.toCsvRow (header fixed to match the columns). */
export function customerCsvRow(c: Customer) {
  return [
    c.id,
    c.authUid,
    c.name,
    c.email,
    c.phone,
    c.createdAt ? c.createdAt.toISOString() : "",
    c.isAnonymous ? "Guest" : "Registered",
    c.isAdmin ? "Admin" : "User",
    c.isProfileComplete ? "Yes" : "No",
  ];
}

/** yyyy-mm-dd (local) → Date at 00:00 or 23:59:59.999 */
export function parseDateInput(value: string, endOfDay = false): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
}

export function todayInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function describeRange(from: string, to: string) {
  const f = parseDateInput(from);
  const t = parseDateInput(to);
  if (f && t) return `${formatDate(f)} – ${formatDate(t)}`;
  if (f) return `from ${formatDate(f)}`;
  if (t) return `until ${formatDate(t)}`;
  return "";
}
