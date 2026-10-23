import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  loading,
  tone,
  onClick,
  active,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
  tone?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border px-4 py-3 text-left",
        onClick && "hover:border-primary/40 transition-colors",
        active && "border-primary ring-primary/20 ring-2"
      )}
    >
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      {loading ? <Skeleton className="mt-1 h-7 w-20" /> : <div className={cn("mt-0.5 text-xl font-semibold tabular-nums", tone)}>{value}</div>}
      {sub && !loading && <div className="text-muted-foreground mt-0.5 truncate text-[11px]">{sub}</div>}
    </Comp>
  );
}
