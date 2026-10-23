"use client";

import { AlertTriangle, Package } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrdersTable } from "@/features/orders/components/orders-table";
import type { UnifiedOrder } from "@/features/orders/types";

export function CustomerOrdersPanel({
  orders,
  loading,
  appError,
  wooError,
}: {
  orders: UnifiedOrder[];
  loading: boolean;
  appError?: Error | null;
  wooError?: string | null;
}) {
  const pager = usePageState(10);
  const view = paginate(orders, pager.page, pager.pageSize);
  return (
    <Card className="gap-0 py-0">
      {(appError || wooError) && (
        <div className="bg-warning/10 text-warning grid gap-1 border-b px-4 py-2 text-xs">
          {wooError && (
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> WooCommerce orders unavailable: {wooError}
            </span>
          )}
          {appError && (
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> App orders unavailable: {appError.message}
            </span>
          )}
        </div>
      )}
      {loading && orders.length === 0 ? (
        <div className="grid gap-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" description="App, phone/office and website orders all show up here." />
      ) : (
        <>
          <OrdersTable rows={view.items} hideCustomer />
          {view.total > 10 && <DataPagination className="border-t px-4 py-3" state={{ ...pager, page: view.page }} total={view.total} itemLabel="orders" />}
        </>
      )}
      <p className="text-muted-foreground border-t px-4 py-2 text-[11px]">
        WooCommerce orders are matched by phone number or email on the order.
      </p>
    </Card>
  );
}
