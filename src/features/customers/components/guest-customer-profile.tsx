"use client";

import { CreditCard, MapPin, Package, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerOrders } from "@/features/orders/hooks/use-customer-orders";
import { addressLines } from "@/features/orders/lib/order-utils";
import { LinkedIdentitiesCard } from "@/features/pincodes/components/linked-identities-card";
import type { OrderAddress } from "@/features/orders/types";
import { formatDate } from "@/lib/format";

import { CustomerAvatar } from "./customer-avatar";
import { BackToCustomers, Count, useTabParam } from "./customer-detail";
import { CustomerInsights } from "./customer-insights";
import { CustomerOrdersPanel } from "./customer-orders-panel";
import { CustomerPaymentsPanel } from "./customer-payments-panel";

const TABS = ["orders", "payments", "addresses"] as const;

/** Unique delivery/billing addresses seen across this person's orders. */
function addressesFromOrders(list: OrderAddress[]) {
  const seen = new Map<string, OrderAddress>();
  for (const a of list) {
    const key = addressLines(a).join("|").toLowerCase();
    if (key && !seen.has(key)) seen.set(key, a);
  }
  return [...seen.values()];
}

/**
 * Profile for someone who only orders by phone / website (no app account):
 * built entirely from their WooCommerce orders, matched by phone or email.
 */
export function GuestCustomerProfile({ phone, email, name }: { phone: string; email: string; name: string }) {
  const [tab, setTab] = useTabParam(TABS, "orders");
  const { orders, loading, wooError } = useCustomerOrders({ uid: null, phone, email });

  const latest = orders[0];
  const displayName = latest?.customer.name || name || "Customer";
  const shownEmail = email || orders.find((o) => o.customer.email)?.customer.email || "";
  const addresses = addressesFromOrders(orders.flatMap((o) => [o.shippingAddress, o.billing]));
  const first = orders.at(-1)?.createdAt;

  return (
    <div className="mx-auto max-w-6xl">
      <BackToCustomers />
      <Card className="mb-6 gap-5 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start gap-4">
          <CustomerAvatar name={displayName} className="size-14 text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{displayName}</h1>
              <Badge variant="outline">
                <Phone /> Not on the app
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Orders placed by phone/office or the website. Built from WooCommerce orders matching this phone or email.
            </p>
          </div>
        </div>
        <CustomerInsights orders={orders} loading={loading} onSelect={setTab} />
        <dl className="grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs font-medium">Phone</dt>
            <dd className="mt-0.5 text-sm tabular-nums">{phone || "-"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs font-medium">Email</dt>
            <dd className="mt-0.5 truncate text-sm">{shownEmail || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium">First order</dt>
            <dd className="mt-0.5 text-sm">{first ? formatDate(first) : "-"}</dd>
          </div>
        </dl>
      </Card>

      <LinkedIdentitiesCard orders={orders} ready={!loading} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="orders">
            <Package className="hidden sm:block" /> Orders <Count n={orders.length} />
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="hidden sm:block" /> Payments
          </TabsTrigger>
          <TabsTrigger value="addresses">
            <MapPin className="hidden sm:block" /> Addresses <Count n={addresses.length} />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <CustomerOrdersPanel orders={orders} loading={loading} wooError={wooError} />
        </TabsContent>
        <TabsContent value="payments">
          <CustomerPaymentsPanel orders={orders} loading={loading} />
        </TabsContent>
        <TabsContent value="addresses">
          {addresses.length === 0 ? (
            <Card className="text-muted-foreground p-6 text-sm">No addresses on their orders.</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a, i) => (
                <Card key={i} className="gap-2 px-5 py-4 text-sm">
                  <div className="font-medium">{[a.firstName, a.lastName].filter(Boolean).join(" ") || "-"}</div>
                  {a.phone && <div className="text-muted-foreground tabular-nums">{a.phone}</div>}
                  <div className="text-muted-foreground leading-relaxed">
                    {addressLines(a).map((l) => (
                      <div key={l}>{l}</div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
