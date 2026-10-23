"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { qk } from "@/lib/query-keys";

import { customersService } from "../services/customers.service";
import { BackToCustomers } from "./customer-detail";
import { GuestCustomerProfile } from "./guest-customer-profile";

/**
 * /customers/lookup?uid=&phone=&email=&name=
 * Opens the app customer's profile if one matches (uid, then phone); otherwise a WooCommerce-only profile.
 */
export function CustomerLookup() {
  const router = useRouter();
  const sp = useSearchParams();
  const uid = sp.get("uid") ?? "";
  const phone = sp.get("phone") ?? "";
  const email = sp.get("email") ?? "";
  const name = sp.get("name") ?? "";
  const lookup = useQuery({
    queryKey: qk.customers.lookup(uid, phone),
    queryFn: () => customersService.findCustomerId({ uid, phone }).catch(() => null),
    staleTime: 5 * 60_000,
  });
  const matchedId = lookup.data;

  React.useEffect(() => {
    if (matchedId) router.replace(`/customers/${matchedId}`);
  }, [matchedId, router]);

  const state = lookup.isPending || matchedId ? "resolving" : "guest";

  if (state === "resolving") {
    return (
      <div className="flex min-h-[50svh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }
  if (!phone && !email) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackToCustomers />
        <Card>
          <EmptyState icon={UserX} title="Customer not found" description="This order has no phone number or email to match on." />
        </Card>
      </div>
    );
  }
  return <GuestCustomerProfile phone={phone} email={email} name={name} />;
}
