import { AlertTriangle, MapPin } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { CustomerAddress } from "../types";

/** Port of CustomerAddressesSheet */
export function CustomerAddressesTab({
  addresses,
  loading,
  error,
}: {
  addresses: CustomerAddress[];
  loading: boolean;
  error: Error | null;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }
  if (error) {
    return (
      <Card>
        <EmptyState icon={AlertTriangle} title="Could not load addresses" description={error.message} />
      </Card>
    );
  }
  if (addresses.length === 0) {
    return (
      <Card>
        <EmptyState icon={MapPin} title="No addresses found" description="Saved delivery addresses will show here." />
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {addresses.map((a) => (
        <Card key={a.id} className="gap-3 px-5 py-4">
          <Badge variant="secondary" className="uppercase">
            <MapPin /> {a.label}
          </Badge>
          <div>
            <div className="font-medium">{a.name || "-"}</div>
            {a.phone && <div className="text-muted-foreground text-sm tabular-nums">{a.phone}</div>}
          </div>
          <div className="text-sm leading-relaxed">
            {a.address1 && <div>{a.address1}</div>}
            {a.landmark && <div className="text-muted-foreground">Landmark: {a.landmark}</div>}
            <div className="text-muted-foreground">
              {[a.state, a.pincode].filter(Boolean).join(" – ")}
              {a.country && `, ${a.country}`}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
