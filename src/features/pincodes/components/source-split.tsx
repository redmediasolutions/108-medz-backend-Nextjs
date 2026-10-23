import type { OrderSource } from "@/features/orders/types";
import { cn } from "@/lib/utils";

const COLORS: Record<OrderSource, string> = {
  app: "bg-primary",
  phone: "bg-warning",
  website: "bg-sky-500",
  other: "bg-muted-foreground/40",
};
const LABELS: Record<OrderSource, string> = { app: "App", phone: "Phone/office", website: "Website", other: "Other" };
const ORDER: OrderSource[] = ["app", "phone", "website", "other"];

/** Stacked bar of where orders came from. */
export function SourceSplit({ value, className }: { value: Record<OrderSource, number>; className?: string }) {
  const total = ORDER.reduce((s, k) => s + value[k], 0);
  const title = ORDER.filter((k) => value[k]).map((k) => `${LABELS[k]}: ${value[k]}`).join(" · ");
  return (
    <div className={cn("bg-muted flex h-2 w-24 overflow-hidden rounded-full", className)} title={title}>
      {total > 0 &&
        ORDER.map((k) =>
          value[k] ? <div key={k} className={COLORS[k]} style={{ width: `${(value[k] / total) * 100}%` }} /> : null
        )}
    </div>
  );
}

export function SourceLegend() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
      {ORDER.slice(0, 3).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", COLORS[k])} />
          {LABELS[k]}
        </span>
      ))}
    </div>
  );
}
