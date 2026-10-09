import type { Metadata } from "next";

import { PrescriptionDetail } from "@/features/prescriptions/components/prescription-detail";

export const metadata: Metadata = { title: "Prescription details" };

export default async function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrescriptionDetail prescriptionId={id} />;
}
