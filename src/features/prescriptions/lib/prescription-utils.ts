import type { Prescription, PrescriptionStatusFilter } from "../types";

export function statusLabel(isReady: boolean) {
  return isReady ? "Prepared" : "Pending";
}

export function filterPrescriptions(
  list: Prescription[],
  query: string,
  status: PrescriptionStatusFilter
): Prescription[] {
  const q = query.trim().toLowerCase();
  return list.filter((p) => {
    if (status === "ready" && !p.isReady) return false;
    if (status === "pending" && p.isReady) return false;
    if (!q) return true;
    return [p.prescriptionID, p.customerName, p.customerMobile, p.prescriptionLabel]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
}

export function formatPrice(value: string) {
  const n = Number(value);
  if (!value || Number.isNaN(n) || n === 0) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}
