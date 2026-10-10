import { DocumentReference, Timestamp, type DocumentSnapshot } from "firebase/firestore";

import type { Prescription, PrescriptionItem } from "../types";

/** Handles both item formats used in Firestore: { productId, productName, comment } and legacy plain ints. */
export function mapPrescriptionItem(raw: unknown): PrescriptionItem | null {
  if (typeof raw === "number") {
    return { productId: raw, productName: "Unknown product", comment: "", legacy: true };
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const id = Number(r.productId);
    if (!Number.isFinite(id)) return null;
    return {
      productId: id,
      productName: (r.productName as string) ?? "",
      comment: (r.comment as string) ?? "",
    };
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function refPath(value: unknown): string | null {
  if (value instanceof DocumentReference) return value.path;
  if (typeof value === "string" && value) return value.replace(/^\//, "");
  return null;
}

/** Port of PrescriptionModel.fromDoc (models/prescriptions.dart). */
export function mapPrescriptionDoc(snap: DocumentSnapshot): Prescription {
  const data = snap.data() ?? {};
  const items = Array.isArray(data.items)
    ? data.items.map(mapPrescriptionItem).filter((i): i is PrescriptionItem => i !== null)
    : [];

  return {
    docId: snap.id,
    prescriptionID: (data.prescriptionID as string) ?? "",
    prescriptionLabel: (data.prescriptionLabel as string) ?? null,
    prescriptionImage: (data.prescriptionImage as string) ?? "",
    isReady: data.isReady === true,
    isArchive: data.isArchive === true,
    userRefPath: refPath(data.UserRef),
    uploadedTime: toDate(data.prescriptionUploadedTime),
    items,
    customerName: (data.customerName as string) ?? null,
    customerMobile: (data.customerMobile as string) ?? null,
  };
}
