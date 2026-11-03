"use client";

import * as React from "react";
import { ChevronDown, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINRStrict } from "@/lib/format";
import { cn } from "@/lib/utils";

import { titleCase } from "../lib/order-utils";
import type { UnifiedOrder } from "../types";

const shortDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d) : "";

function itemsSummary(o: UnifiedOrder) {
  const named = o.items.filter((i) => i.productId > 0);
  const shown = named.slice(0, 3).map((i) => `${i.name} ×${i.quantity}`);
  return named.length > 3 ? `${shown.join(", ")} +${named.length - 3} more` : shown.join(", ");
}

/** Swiggy-style "Repeat order": latest order up front, earlier ones one click away. */
export function RepeatOrderCard({
  orders,
  busyKey,
  onRepeat,
}: {
  orders: UnifiedOrder[];
  busyKey: string | null;
  onRepeat: (o: UnifiedOrder) => void;
}) {
  const [more, setMore] = React.useState(false);
  if (orders.length === 0) return null;
  const [latest, ...earlier] = orders;

  return (
    <Card className="border-primary/30 bg-primary/5 gap-0 py-0">
      <CardContent className="grid gap-3 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
            <RotateCcw className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              Repeat last order <span className="text-muted-foreground font-normal">· #{latest.number}</span>
            </div>
            <div className="text-muted-foreground text-xs">
              {shortDate(latest.createdAt)} · {titleCase(latest.status)} · {formatINRStrict(latest.total)}
            </div>
            <div className="mt-1 line-clamp-2 text-sm">{itemsSummary(latest)}</div>
          </div>
          <Button size="sm" onClick={() => onRepeat(latest)} disabled={busyKey !== null}>
            {busyKey === latest.key ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Repeat order
          </Button>
        </div>

        {earlier.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
              {more ? "Hide earlier orders" : `Earlier orders (${earlier.length})`}
            </button>
            {more && (
              <ul className="mt-2 grid gap-2">
                {earlier.map((o) => (
                  <li key={o.key} className="bg-background flex items-center gap-3 rounded-lg border px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs">
                        <span className="font-medium">#{o.number}</span>{" "}
                        <span className="text-muted-foreground">
                          · {shortDate(o.createdAt)} · {formatINRStrict(o.total)}
                        </span>
                      </div>
                      <div className="truncate text-xs">{itemsSummary(o)}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onRepeat(o)} disabled={busyKey !== null}>
                      {busyKey === o.key ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                      Repeat
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
