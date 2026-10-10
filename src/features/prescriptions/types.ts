/** One medicine line on a prescription (Firestore: Prescription.items[]). */
export type PrescriptionItem = {
  productId: number;
  productName: string;
  comment: string;
  /** true when stored in the legacy format (plain int product id) */
  legacy?: boolean;
};

export type PrescriptionStatus = "pending" | "ready";

/** Firestore: Prescription/{docId} + resolved customer from UserRef → Users/{uid}. */
export type Prescription = {
  docId: string;
  prescriptionID: string;
  prescriptionLabel: string | null;
  prescriptionImage: string;
  isReady: boolean;
  isArchive: boolean;
  userRefPath: string | null;
  uploadedTime: Date | null;
  items: PrescriptionItem[];
  customerName: string | null;
  customerMobile: string | null;
};

export type PrescriptionCustomer = {
  name: string | null;
  phone: string | null;
};

/** Product search lives in features/products — re-exported for existing imports. */
export type { Product as ProductSearchResult } from "@/features/products/types";

export type PrescriptionStatusFilter = "all" | PrescriptionStatus;
