"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Link2, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { formatDate, formatINRStrict } from "@/lib/format";
import { cn } from "@/lib/utils";

import { LINK_LABEL, type PersonCluster } from "../types";
import { AccountChip, EmailChip, PhoneChip } from "./identity-chips";
import { SourceSplit } from "./source-split";

/** One person / household: every phone, account, name and address they've used. */
export function PersonClusterCard({ person: p, currentPincode }: { person: PersonCluster; currentPincode?: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, ...aliases] = p.names.length ? p.names : ["Unknown"];
  const otherPins = p.pincodes.filter((x) => x && x !== currentPincode);

  return (
    <Card className={cn("gap-0 py-0", p.multiIdentity && "border-warning/40")}>
      <div className="grid gap-3 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{name}</span>
              {p.multiIdentity && (
                <Badge variant="warning">
                  <Link2 />
                  {p.phones.length > 1 ? `${p.phones.length} phones` : ""}
                  {p.phones.length > 1 && p.accounts.length > 1 ? " · " : ""}
                  {p.accounts.length > 1 ? `${p.accounts.length} app accounts` : ""}
                </Badge>
              )}
            </div>
            {aliases.length > 0 && (
              <div className="text-muted-foreground mt-0.5 text-xs">also as {aliases.slice(0, 4).join(", ")}</div>
            )}
          </div>
          <div className="text-right">
            <div className="font-semibold tabular-nums">{formatINRStrict(p.spend)}</div>
            <div className="text-muted-foreground text-xs">
              {p.orderCount} order{p.orderCount === 1 ? "" : "s"} · last {formatDate(p.lastOrderAt)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {p.phones.map((ph) => (
            <PhoneChip key={ph} phone={ph} />
          ))}
          {p.accounts.map((u) => (
            <AccountChip key={u} uid={u} />
          ))}
          {p.emails.slice(0, 2).map((e) => (
            <EmailChip key={e} email={e} />
          ))}
        </div>

        {p.addresses[0] && (
          <div className="text-muted-foreground flex items-start gap-1.5 text-sm">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0">
              {p.addresses[0]}
              {p.addresses.length > 1 && <span className="text-xs"> (+{p.addresses.length - 1} more written differently)</span>}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <SourceSplit value={p.bySource} />
            {p.multiIdentity &&
              p.reasons.map((r) => (
                <Badge key={r} variant="outline" className="font-normal">
                  {LINK_LABEL[r]}
                </Badge>
              ))}
            {otherPins.map((pin) => (
              <Link key={pin} href={`/pincodes/${pin}`} className="text-primary hover:underline">
                also orders to {pin}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
          >
            {open ? "Hide" : "Show"} orders
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t">
          <OrdersTable rows={p.orders} hideCustomer />
        </div>
      )}
    </Card>
  );
}
