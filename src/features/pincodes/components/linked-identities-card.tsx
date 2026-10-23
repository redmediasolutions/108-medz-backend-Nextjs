"use client";

import Link from "next/link";
import { Link2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { UnifiedOrder } from "@/features/orders/types";

import { useLinkedIdentities } from "../hooks/use-linked-identities";
import { LINK_LABEL } from "../types";
import { AccountChip, EmailChip, NameChip, PhoneChip } from "./identity-chips";

/**
 * Shown on customer profiles: other phones / app accounts / names that look like the same person,
 * found by matching addresses within the customer's delivery pincodes. Renders nothing when there are none.
 */
export function LinkedIdentitiesCard({ orders, ready }: { orders: UnifiedOrder[]; ready: boolean }) {
  const { loading, cluster, others, pins } = useLinkedIdentities(orders, ready);

  if (!ready || (!loading && others.length === 0)) return null;

  if (loading) {
    return (
      <div className="text-muted-foreground mb-6 flex items-center gap-2 text-xs">
        <Loader2 className="size-3.5 animate-spin" /> Checking other orders to the same address…
      </div>
    );
  }

  const extraOrders = cluster ? cluster.orderCount - orders.length : 0;
  return (
    <Card className="border-warning/40 bg-warning/5 mb-6 gap-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="text-warning size-4" />
        <span className="font-medium">Also orders as</span>
        {cluster?.reasons.map((r) => (
          <Badge key={r} variant="outline" className="bg-background font-normal">
            {LINK_LABEL[r]}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {others.map((o) =>
          o.kind === "phone" ? (
            <PhoneChip key={`p${o.value}`} phone={o.value} className="bg-background" />
          ) : o.kind === "account" ? (
            <AccountChip key={`a${o.value}`} uid={o.value} className="bg-background" />
          ) : o.kind === "email" ? (
            <EmailChip key={`e${o.value}`} email={o.value} className="bg-background" />
          ) : (
            <NameChip key={`n${o.value}`} name={o.value} className="bg-background" />
          )
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {extraOrders > 0 && <>{extraOrders} more order{extraOrders === 1 ? "" : "s"} likely from this person. </>}
        Matched on delivery address within pincode{" "}
        {pins.map((p, i) => (
          <span key={p}>
            {i > 0 && ", "}
            <Link href={`/pincodes/${p}`} className="text-primary hover:underline">
              {p}
            </Link>
          </span>
        ))}
        . Could also be family members at the same address.
      </p>
    </Card>
  );
}
