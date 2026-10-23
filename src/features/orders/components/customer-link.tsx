import Link from "next/link";

import { cn } from "@/lib/utils";

import type { UnifiedOrder } from "../types";

/** Opens the full customer profile — app customer if we can match one, otherwise a WooCommerce-only profile. */
export function customerHref(c: UnifiedOrder["customer"]) {
  const q = new URLSearchParams();
  if (c.uid) q.set("uid", c.uid);
  if (c.phone) q.set("phone", c.phone);
  if (c.email) q.set("email", c.email);
  if (c.name) q.set("name", c.name);
  return `/customers/lookup?${q}`;
}

export function CustomerLink({
  customer,
  className,
  children,
}: {
  customer: UnifiedOrder["customer"];
  className?: string;
  children?: React.ReactNode;
}) {
  if (!customer.uid && !customer.phone && !customer.email) return <span className={className}>{children ?? customer.name}</span>;
  return (
    <Link
      href={customerHref(customer)}
      onClick={(e) => e.stopPropagation()}
      className={cn("hover:text-primary underline-offset-4 hover:underline", className)}
    >
      {children ?? customer.name}
    </Link>
  );
}
