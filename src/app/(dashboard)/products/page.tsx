import { Suspense } from "react";
import type { Metadata } from "next";

import { ProductsDashboard } from "@/features/products/components/products-dashboard";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsDashboard />
    </Suspense>
  );
}
