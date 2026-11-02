"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Searcher } from "../types";

/** Who searched: name + phone linking to their profile. */
export function SearcherCell({ id, user, loading }: { id: string | null; user: Searcher | null | undefined; loading: boolean }) {
  if (!id) return <span className="text-muted-foreground text-sm">Unknown</span>;
  if (loading && user === undefined) return <Skeleton className="h-8 w-36" />;
  if (!user) return <span className="text-muted-foreground text-sm">Deleted account</span>;
  return (
    <Link href={`/customers/${user.id}`} className="group block min-w-0" onClick={(e) => e.stopPropagation()}>
      <div className="max-w-48 truncate text-sm font-medium group-hover:underline">{user.name || "Unnamed"}</div>
      <div className="text-muted-foreground text-xs tabular-nums">{user.phone || "—"}</div>
    </Link>
  );
}

/** Call them back and place the order for them. */
export function NewOrderButton({ userId }: { userId: string | null }) {
  if (!userId) return null;
  return (
    <Button size="sm" variant="outline" asChild>
      <Link href={`/orders/new?customer=${encodeURIComponent(userId)}`} onClick={(e) => e.stopPropagation()}>
        <ShoppingCart /> New order
      </Link>
    </Button>
  );
}
