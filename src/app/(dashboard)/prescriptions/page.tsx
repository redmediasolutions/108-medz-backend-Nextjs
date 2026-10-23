import { Suspense } from "react";
import type { Metadata } from "next";

import { PrescriptionsDashboard } from "@/features/prescriptions/components/prescriptions-dashboard";

export const metadata: Metadata = { title: "Prescriptions" };

export default function PrescriptionsPage() {
  return (
    <Suspense>
      <PrescriptionsDashboard />
    </Suspense>
  );
}
