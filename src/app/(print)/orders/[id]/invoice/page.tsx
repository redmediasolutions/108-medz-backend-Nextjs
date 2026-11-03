import type { Metadata } from "next";

import { OrderInvoice } from "@/features/orders/components/order-invoice";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderInvoice orderId={decodeURIComponent(id)} />;
}
