import { Suspense } from "react";
import type { Metadata } from "next";

import { PincodeDetail } from "@/features/pincodes/components/pincode-detail";

export const metadata: Metadata = { title: "Area" };

export default async function PincodePage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  return (
    <Suspense>
      <PincodeDetail pincode={decodeURIComponent(pin)} />
    </Suspense>
  );
}
