import { Suspense } from "react";
import type { Metadata } from "next";

import { OrdersDashboard } from "@/features/orders/components/orders-dashboard";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersDashboard />
    </Suspense>
  );
}
