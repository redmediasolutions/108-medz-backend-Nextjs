"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, Printer } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

import { useOrderInvoice } from "../hooks/use-order-invoice";
import { INVOICE_SELLER } from "../lib/invoice-config";
import type { Invoice } from "../lib/invoice-mapper";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const money = (x: number) => inr.format(x);
const longDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(d) : "—";

/**
 * Printable A4 invoice built from Firestore Orders/{id}.
 * Layout follows the WooCommerce PDF invoice, with two changes asked for:
 *  - customer ("Bill & Ship To") sits top-right where "From" was, the seller sits under INVOICE
 *  - billing + shipping are one block
 * "Print / Save PDF" uses the browser's print dialog; the file name defaults to invoice-<number>.
 */
export function OrderInvoice({ orderId }: { orderId: string }) {
  const { invoice, loading, error } = useOrderInvoice(orderId);

  React.useEffect(() => {
    if (!invoice) return;
    const prev = document.title;
    document.title = `invoice-${invoice.invoiceNumber}`;
    return () => {
      document.title = prev;
    };
  }, [invoice]);

  return (
    <div className="bg-muted/40 min-h-svh print:bg-white">
      <div className="bg-background sticky top-0 z-10 border-b print:hidden">
        <div className="mx-auto flex max-w-[210mm] items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orders/${encodeURIComponent(orderId)}`}>
              <ArrowLeft /> Order #{orderId}
            </Link>
          </Button>
          <div className="flex-1" />
          <Button size="sm" disabled={!invoice} onClick={() => window.print()}>
            <Printer /> Print / Save PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : error || !invoice ? (
        <EmptyState icon={AlertTriangle} title="Could not build the invoice" description={error ?? "Order not found"} />
      ) : (
        <div className="py-6 print:py-0">
          <InvoiceSheet invoice={invoice} />
        </div>
      )}

      <style>{`@page { size: A4; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>
    </div>
  );
}

export function InvoiceSheet({ invoice: inv }: { invoice: Invoice }) {
  const c = inv.customer;
  return (
    <article
      className="mx-auto min-h-[297mm] w-[210mm] print:min-h-0 bg-white px-[16mm] py-[12mm] text-[11px] leading-[1.6] text-black shadow-sm [color-scheme:light] print:shadow-none"
      style={{ fontFamily: "'Open Sans', var(--font-sans), Arial, sans-serif" }}
    >
      {/* Logo + Bill & Ship To (customer moved to where "From" was) */}
      <header className="flex items-start justify-between gap-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={INVOICE_SELLER.logo} alt="108 Medz" className="h-[30mm] w-[30mm] object-contain" />
        <div className="w-[62mm]">
          <div className="font-bold">Bill &amp; Ship To:</div>
          <div className="font-bold">{c.name}</div>
          {c.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {c.phone && <div>Mobile No.: {c.phone}</div>}
          {c.email && <div>{c.email}</div>}
          {c.billingNote && <div className="mt-1 text-[10px] text-neutral-600">Billing address: {c.billingNote}</div>}
        </div>
      </header>

      <h1 className="mt-6 mb-3 text-[17px] font-bold tracking-wide">INVOICE</h1>

      {/* From (seller) + invoice meta */}
      <section className="flex items-start justify-between gap-8">
        <div className="max-w-[80mm]">
          <div className="font-bold">From:</div>
          <div className="font-bold">{INVOICE_SELLER.name}</div>
          {INVOICE_SELLER.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
          <div>Customer ID: {INVOICE_SELLER.customerId}</div>
          <div>Mobile No.: {INVOICE_SELLER.mobile}</div>
        </div>
        <table className="w-[62mm] shrink-0">
          <tbody>
            <Meta label="Invoice Number:" value={inv.invoiceNumber} />
            <Meta label="Invoice Date:" value={longDate(inv.invoiceDate)} />
            <Meta label="Order Number:" value={inv.orderNumber} />
            <Meta label="Order Date:" value={longDate(inv.orderDate)} />
            <Meta label="Payment:" value={`${inv.paymentMethod}${inv.paid ? " · Paid" : ""}`} />
          </tbody>
        </table>
      </section>

      {/* Items */}
      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="bg-black text-left text-white">
            <th className="px-1.5 py-1.5 font-bold">Product</th>
            <th className="w-[33mm] px-1.5 py-1.5 font-bold">Quantity</th>
            <th className="w-[33mm] px-1.5 py-1.5 font-bold">Price</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={i} className="border-b border-neutral-300 align-top">
              <td className="px-1.5 py-2">{it.name}</td>
              <td className="px-1.5 py-2">{it.quantity}</td>
              <td className="px-1.5 py-2">{money(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <table className="mt-0 ml-auto w-[66mm] border-collapse">
        <tbody>
          <Total label="Subtotal" value={money(inv.subtotal)} />
          {inv.discount > 0 && <Total label="Discount" value={`−${money(inv.discount)}`} />}
          <Total label="Shipping" value={inv.shipping > 0 ? money(inv.shipping) : "Free shipping"} />
          {inv.codCharge > 0 && <Total label="COD Charges" value={money(inv.codCharge)} />}
          <Total label="Tax" value={money(inv.tax)} />
          {inv.walletUsed > 0 && <Total label="Wallet used" value={`−${money(inv.walletUsed)}`} />}
          <tr className="border-t-2 border-b border-black">
            <td className="px-1.5 py-1.5 font-bold">Total</td>
            <td className="w-[33mm] px-1.5 py-1.5 font-bold">{money(inv.total)}</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <tr className="align-top">
      <td className="w-[25mm] pr-2">{label}</td>
      <td>{value}</td>
    </tr>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-neutral-300">
      <td className="px-1.5 py-1.5 font-bold">{label}</td>
      <td className="w-[33mm] px-1.5 py-1.5">{value}</td>
    </tr>
  );
}
