import { Suspense } from "react";
import type { Metadata } from "next";

import { SalesReport } from "@/features/reports/components/sales-report";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <Suspense>
      <SalesReport />
    </Suspense>
  );
}
