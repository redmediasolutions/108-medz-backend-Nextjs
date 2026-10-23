import { Skeleton } from "@/components/ui/skeleton";
import { summarizeOrders } from "@/features/orders/lib/order-utils";
import type { UnifiedOrder } from "@/features/orders/types";
import { formatDate, formatINRStrict } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Lifetime numbers across app + WooCommerce orders. */
export function CustomerInsights({
  orders,
  loading,
  wallet,
  onSelect,
}: {
  orders: UnifiedOrder[];
  loading: boolean;
  /** omit for WooCommerce-only customers */
  wallet?: { value: number; loading: boolean };
  onSelect?: (tab: string) => void;
}) {
  const s = summarizeOrders(orders);
  const split = [
    s.bySource.app && `${s.bySource.app} app`,
    s.bySource.phone && `${s.bySource.phone} phone`,
    s.bySource.website && `${s.bySource.website} web`,
    s.bySource.other && `${s.bySource.other} other`,
  ]
    .filter(Boolean)
    .join(" · ");

  const tiles = [
    { label: "Lifetime spend", value: formatINRStrict(s.spent), sub: s.count ? `avg ${formatINRStrict(s.average)}` : "", tab: "orders" },
    { label: "Orders", value: String(s.count), sub: split, tab: "orders" },
    {
      label: "Due",
      value: formatINRStrict(s.due),
      sub: s.paid ? `${formatINRStrict(s.paid)} paid` : "",
      tab: "payments",
      tone: s.due > 0 ? "text-warning" : "",
    },
    wallet
      ? { label: "Wallet", value: formatINRStrict(wallet.value), sub: s.walletUsed ? `${formatINRStrict(s.walletUsed)} used` : "", tab: "rewards", loading: wallet.loading }
      : { label: "Last order", value: s.lastOrderAt ? formatDate(s.lastOrderAt) : "—", sub: "", tab: "orders" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onSelect?.(t.tab)}
          className="hover:border-primary/40 bg-card rounded-lg border px-3 py-2.5 text-left transition-colors"
        >
          <div className="text-muted-foreground text-xs">{t.label}</div>
          {loading || ("loading" in t && t.loading) ? (
            <Skeleton className="mt-1 h-6 w-20" />
          ) : (
            <div className={cn("text-lg font-semibold tabular-nums", "tone" in t && t.tone)}>{t.value}</div>
          )}
          {t.sub && !loading && <div className="text-muted-foreground truncate text-[11px]">{t.sub}</div>}
        </button>
      ))}
    </div>
  );
}
