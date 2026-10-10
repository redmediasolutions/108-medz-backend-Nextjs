import { Clock, Wallet } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatINRStrict } from "@/lib/format";

/** Balance card from customer_rewards_screen.dart, in the app's primary colour. */
export function WalletBalanceCard({
  available,
  pending,
  loading,
  actions,
}: {
  available: number;
  pending: number;
  loading?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="from-primary to-primary/75 text-primary-foreground relative overflow-hidden rounded-xl bg-gradient-to-br p-5 shadow-sm">
      <Wallet className="pointer-events-none absolute -bottom-8 left-1/3 size-36 opacity-[0.07]" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm opacity-80">Available points</div>
          {loading ? (
            <Skeleton className="mt-1 h-9 w-36 bg-white/20" />
          ) : (
            <div className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums">{formatINRStrict(available)}</div>
          )}
          {pending > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-xs">
              <Clock className="size-3.5" /> Pending rewards: {formatINRStrict(pending)}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
