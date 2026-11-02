import { Suspense } from "react";
import type { Metadata } from "next";

import { SearchdataDashboard } from "@/features/searchdata/components/searchdata-dashboard";

export const metadata: Metadata = { title: "Search data" };

export default function SearchdataPage() {
  return (
    <Suspense>
      <SearchdataDashboard />
    </Suspense>
  );
}
