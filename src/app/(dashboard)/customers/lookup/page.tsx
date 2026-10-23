import { Suspense } from "react";
import type { Metadata } from "next";

import { CustomerLookup } from "@/features/customers/components/customer-lookup";

export const metadata: Metadata = { title: "Customer" };

export default function CustomerLookupPage() {
  return (
    <Suspense>
      <CustomerLookup />
    </Suspense>
  );
}
