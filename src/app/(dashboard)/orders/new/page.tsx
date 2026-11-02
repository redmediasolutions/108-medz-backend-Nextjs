import { Suspense } from "react";
import type { Metadata } from "next";

import { NewOrderForm } from "@/features/orders/addform/new-order-form";

export const metadata: Metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderForm />
    </Suspense>
  );
}
