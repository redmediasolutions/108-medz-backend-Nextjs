import type { Metadata } from "next";

import { CustomersDashboard } from "@/features/customers/components/customers-dashboard";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return <CustomersDashboard />;
}
