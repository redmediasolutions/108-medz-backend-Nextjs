import type { MonthKey } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKeyOf = (d: Date): MonthKey => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Local (IST) month range: [first day 00:00, first day of next month 00:00). */
export function monthRange(month: MonthKey): { from: Date; to: Date; after: string; before: string } {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 1);
  const last = new Date(y, m, 0);
  return {
    from,
    to,
    after: `${y}-${pad(m)}-01`,
    before: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
  };
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
}

export const monthLabel = (month: MonthKey) => {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
};

export const isValidMonth = (v: string | null): v is MonthKey => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
