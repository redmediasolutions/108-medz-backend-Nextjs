import { Suspense } from "react";
import type { Metadata } from "next";

import { PincodesDashboard } from "@/features/pincodes/components/pincodes-dashboard";

export const metadata: Metadata = { title: "Areas" };

export default function PincodesPage() {
  return (
    <Suspense>
      <PincodesDashboard />
    </Suspense>
  );
}
